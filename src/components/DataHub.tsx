import { useEffect, useState } from 'react'
import {
  downloadJSON, downloadCSV,
  readJSONFile, readCSVFile, importJSONBackup, importCSV,
  exportPdf, exportAllPdfs,
} from '../data/storage'
import {
  syncToGitHub, syncFromGitHub,
  getStoredToken, storeToken, clearToken,
  getStoredRepo, storeRepo,
  GITHUB_BACKUP_PATH,
} from '../data/githubSync'
import { db } from '../db'
import type { CollectionName, Leitura, ReadingPdf } from '../types'
import { Download, Upload, FileJson, FileSpreadsheet, FileText, Check, Loader2, Github, Trash2 } from 'lucide-react'

const COLLECTIONS: { key: CollectionName; label: string }[] = [
  { key: 'leituras', label: 'LEITURAS' },
  { key: 'notas_novas', label: 'NOTAS NOVAS' },
  { key: 'autores_citados', label: 'AUTORES CITADOS' },
  { key: 'por_ler', label: 'POR LER' },
  { key: 'tarefas', label: 'TAREFAS' },
]

export default function DataHub() {
  const [busy, setBusy] = useState(false)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvCollection, setCsvCollection] = useState<CollectionName>('leituras')
  const [message, setMessage] = useState<string | null>(null)
  const [pdfRows, setPdfRows] = useState<{ leitura: Leitura; pdf: ReadingPdf }[]>([])
  const [ghToken, setGhToken] = useState('')
  const [ghRepo, setGhRepo] = useState('')
  const [ghStatus, setGhStatus] = useState<string | null>(null)

  useEffect(() => { loadPdfs() }, [])

  useEffect(() => {
    setGhToken(getStoredToken() ?? '')
    setGhRepo(getStoredRepo() ?? '')
  }, [])

  async function loadPdfs() {
    const pdfs = await db.pdfs.toArray()
    const leituras = await db.leituras.toArray()
    const byId = new Map(leituras.map((l) => [l.id, l]))
    setPdfRows(pdfs.map((p) => ({ leitura: byId.get(p.id_leitura) ?? { id: p.id_leitura, titulo: p.id_leitura, autores: '', ano: null, referencia_apa: '', problematica: '', tese: '', estado: '', fonte_link: '', conferencias: '', tema: '', relevancia: '', created_at: '', updated_at: '' }, pdf: p })))
  }

  async function exportJSON() {
    setBusy(true); setMessage(null)
    downloadJSON(); setBusy(false)
  }

  async function exportCSV() {
    setBusy(true); setMessage(null)
    await downloadCSV(); setBusy(false)
  }

  async function importJSON() {
    if (!jsonFile) return
    setBusy(true); setMessage(null)
    try {
      const text = await readJSONFile(jsonFile)
      const result = await importJSONBackup(text)
      const total = Object.values(result.imported).reduce((a, b) => a + b, 0)
      setMessage(`Importação concluída — ${total} registos de ${Object.keys(result.imported).length} folhas substituídos.`)
      setJsonFile(null)
    } catch (err: any) {
      setMessage(`Erro na importação JSON: ${err.message}`)
    } finally { setBusy(false) }
  }

  async function importCSVFile() {
    if (!csvFile) return
    setBusy(true); setMessage(null)
    try {
      const text = await readCSVFile(csvFile)
      const result = await importCSV(csvCollection, text)
      setMessage(`Importação ${csvCollection}: ${result.added} registos adicionados.`)
      setCsvFile(null)
    } catch (err: any) {
      setMessage(`Erro na importação CSV: ${err.message}`)
    } finally { setBusy(false) }
  }

  async function syncToGitHubAction() {
    if (!ghToken.trim() || !ghRepo.trim()) { setGhStatus('Introduza o token e o repositório (owner/repo).'); return }
    setBusy(true); setGhStatus(null)
    try {
      const res = await syncToGitHub(ghToken.trim(), ghRepo.trim())
      storeToken(ghToken.trim()); storeRepo(ghRepo.trim())
      setGhStatus(res.message)
      setMessage(null)
    } catch (err: any) { setGhStatus(`Erro no upload para o GitHub: ${err.message}`) } finally { setBusy(false) }
  }

  async function syncFromGitHubAction() {
    if (!ghToken.trim() || !ghRepo.trim()) { setGhStatus('Introduza o token e o repositório (owner/repo).'); return }
    setBusy(true); setGhStatus(null)
    try {
      const res = await syncFromGitHub(ghToken.trim(), ghRepo.trim())
      storeToken(ghToken.trim()); storeRepo(ghRepo.trim())
      setGhStatus(res.message)
      setMessage(null)
      await loadPdfs()
    } catch (err: any) { setGhStatus(`Erro ao importar do GitHub: ${err.message}`) } finally { setBusy(false) }
  }

  async function exportOnePdf(id_leitura: string) {
    setBusy(true); setMessage(null)
    try { await exportPdf(id_leitura); setMessage('PDF descarregado.') } catch (err: any) { setMessage(`Erro: ${err.message}`) } finally { setBusy(false) }
  }

  async function exportAllPdfFiles() {
    if (pdfRows.length === 0) { setMessage('Não há PDFs guardados para descarregar.'); return }
    setBusy(true); setMessage(null)
    try {
      const n = await exportAllPdfs((blob, filename) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
      setMessage(`${n} PDF(s) descarregados.`)
    } catch (err: any) { setMessage(`Erro: ${err.message}`) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Importação e Exportação</h1>
        <p className="text-sm text-slate-500">Faça backup JSON completo do caderno ou partilhe folhas por CSV.</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileJson className="h-5 w-5 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-700">Backup JSON</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Exporte ou importe todos os registos de uma só vez. Ideal para migração e versionamento do caderno.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportJSON} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar JSON
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              <span>Importar JSON</span>
              <input type="file" accept="application/json" className="hidden" onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)} />
            </label>
            <button onClick={importJSON} disabled={busy || !jsonFile} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">Importar</button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">Exportação CSV</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Exporte todas as folhas num único ficheiro CSV, com uma secção por folha (LEITURAS, NOTAS, …).</p>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportCSV} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-rose-600" />
          <h2 className="text-sm font-semibold text-slate-700">Descarregar PDFs das leituras</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">Transfira os ficheiros PDF associados às leituras — um de cada vez ou todos de uma vez. Ideal para conservar as fontes originais.</p>
        {pdfRows.length === 0 ? (
          <p className="text-xs text-slate-400">Não há PDFs guardados. Adicione ficheiros na página «Leituras».</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <button onClick={exportAllPdfFiles} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download de todos ({pdfRows.length})
              </button>
            </div>
            <ul className="space-y-2">
              {pdfRows.map((row) => (
                <li key={row.pdf.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">{row.leitura.id} — {row.leitura.titulo}</p>
                    <p className="text-xs text-slate-400">{row.pdf.filename}</p>
                  </div>
                  <button onClick={() => exportOnePdf(row.pdf.id_leitura)} disabled={busy} className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                    <Download className="inline h-4 w-4" /> PDF
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Github className="h-5 w-5 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-700">Sincronização com o GitHub</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Guarde o caderno inteiro (registos, regras, PDFs e anotações) num ficheiro dentro do seu repositório do GitHub e
          traga-o para outro computador. O token é guardado no navegador — introduza-o apenas uma vez por máquina.
        </p>

        <div className="mb-4 space-y-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p><strong>Como configurar:</strong></p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Crie um <em>Personal Access Token</em> em github.com/settings/tokens (scope <code>repo</code>).</li>
            <li>Crie ou use um repositório público com o código (ex.: <code>cssr/caderno-digital-investigacao</code>).</li>
            <li>Paste o token e o nome do repositório, depois clique em «Sincronizar para o GitHub».</li>
          </ol>
        </div>

        {ghStatus && (
          <div className={`mb-4 flex items-center gap-2 rounded-md px-4 py-3 text-sm ${ghStatus.startsWith('Erro') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <Check className="h-4 w-4" /> {ghStatus}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">Token do GitHub</label>
            <input
              type="password"
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              placeholder="ghp_… (guardado no navegador)"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-slate-500">Repositório (owner/repo)</label>
            <input
              type="text"
              value={ghRepo}
              onChange={(e) => setGhRepo(e.target.value)}
              placeholder="cssr/caderno-digital-investigacao"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={syncToGitHubAction} disabled={busy || !ghToken.trim() || !ghRepo.trim()} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Sincronizar para o GitHub
          </button>
          <button onClick={syncFromGitHubAction} disabled={busy || !ghToken.trim() || !ghRepo.trim()} className="inline-flex items-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sincronizar do GitHub (substitui os dados locais)
          </button>
          <button onClick={() => { clearToken(); setGhToken(''); setGhStatus('Token removido.') }} className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <Trash2 className="inline h-4 w-4" /> Limpar token
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">O ficheiro é armazenado em <code>{GITHUB_BACKUP_PATH}</code> do repositório.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-5 w-5 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-700">Importação por folha (CSV)</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">Adicione registos a uma folha específica a partir de um ficheiro CSV com as mesmas colunas da folha.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Folha</label>
            <select value={csvCollection} onChange={(e) => setCsvCollection(e.target.value as CollectionName)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              {COLLECTIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            <span>{csvFile ? csvFile.name : 'Escolher CSV…'}</span>
            <input type="file" accept="text/csv,.csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={importCSVFile} disabled={busy || !csvFile} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">Importar</button>
        </div>
      </div>
    </div>
  )
}
