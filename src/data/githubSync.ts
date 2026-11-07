// ============================================================================
// Cross-computer sync via GitHub.
// Uploads / downloads the full caderno backup as a JSON file stored inside the
// repository (data/backup.json). Uses the GitHub Contents API directly from the
// browser (it supports CORS). The token and repo are remembered once per
// computer in localStorage, so the user only pastes the token a single time.
// ============================================================================
import { buildJSONBackup, importJSONBackup } from './storage'

const TOKEN_KEY = 'caderno-github-token'
const REPO_KEY = 'caderno-github-repo'
const BACKUP_PATH = 'data/backup.json'
const BRANCH = 'main'

/** Token remembered in localStorage (entered once per computer). */
export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function storeToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token.trim()) } catch {}
}
export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}
/** Repo name (owner/repo) remembered in localStorage. */
export function getStoredRepo(): string | null {
  try { return localStorage.getItem(REPO_KEY) } catch { return null }
}
export function storeRepo(repo: string): void {
  try { localStorage.setItem(REPO_KEY, repo.trim()) } catch {}
}

function parseRepo(repo: string): { owner: string; name: string } {
  const parts = String(repo).trim().split('/').map((s) => s.trim()).filter((s) => s.length > 0)
  if (parts.length < 2) throw new Error('Repositório inválido — use o formato owner/repo (ex.: cssr/caderno-digital-investigacao)')
  return { owner: parts[parts.length - 2], name: parts[parts.length - 1] }
}

async function api(token: string, method: string, url: string, body?: any): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = await res.text()
    try { detail = JSON.parse(detail).message ?? detail } catch {}
    throw new Error(`Falha na API do GitHub (${res.status}): ${detail}`)
  }
  return res.json()
}

/** Upload a UTF-8 string to a file path in the repo (creates or updates it). */
export async function uploadFile(token: string, repo: string, path: string, content: string): Promise<void> {
  const { owner, name } = parseRepo(repo)
  await api(token, 'PUT', `https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
    message: 'sync caderno',
    content: btoa(unescape(encodeURIComponent(content))),
    branch: BRANCH,
  })
}

/** Download a file's UTF-8 text content from the repo. */
export async function downloadFile(token: string, repo: string, path: string): Promise<string> {
  const { owner, name } = parseRepo(repo)
  const json = await api(token, 'GET', `https://api.github.com/repos/${owner}/${name}/contents/${path}?ref=${BRANCH}`)
  if (!json.content) throw new Error('O ficheiro está vazio ou não existe no repositório')
  return decodeURIComponent(escape(atob(json.content)))
}

export interface GitHubSyncResult {
  ok: boolean
  message: string
  bytes: number
}

/** Upload the entire caderno (data + settings + PDFs + annotations) to the repo. */
export async function syncToGitHub(token: string, repo: string): Promise<GitHubSyncResult> {
  const content = await buildJSONBackup()
  await uploadFile(token, repo, BACKUP_PATH, content)
  return { ok: true, message: `Sincronizado com o GitHub — ${content.length} caracteres guardados em ${BACKUP_PATH}.`, bytes: content.length }
}

/** Pull the backup from the repo and restore it into IndexedDB (overwrites local data). */
export async function syncFromGitHub(token: string, repo: string): Promise<GitHubSyncResult> {
  const content = await downloadFile(token, repo, BACKUP_PATH)
  const result = await importJSONBackup(content)
  const total = Object.values(result.imported).reduce((a, b) => a + b, 0)
  return { ok: true, message: `Importado do GitHub — ${total} registos de ${Object.keys(result.imported).length} folhas restaurados.`, bytes: content.length }
}

export const GITHUB_BACKUP_PATH = BACKUP_PATH
