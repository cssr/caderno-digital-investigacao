// ============================================================================
// App settings: user-configured Themes and Relevance scale.
// Persisted in IndexedDB (single record, id = 'app').
// ============================================================================
import { db } from '../db'
import type { AppSettings } from '../types'
import { TIPOS_DE_NOTA } from '../types'

/** Default configuration shown the first time the app is opened. */
export const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'updated_at'> = {
  themes: [
    'Problemática da investigação',
    'Teoria / Conceitos-chave',
    'Metodologia',
    'Reconhecimento e validação',
    'Experiência e saberes',
    'Outro',
  ],
  relevance_levels: [
    'Essencial',
    'Importante',
    'Útil',
    'Secundário',
    'Baixa relevância',
  ],
  note_types: [...TIPOS_DE_NOTA] as unknown as string[],
}

const SETTINGS_ID = 'app'

/** Return the settings, creating defaults when none exist yet. */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get(SETTINGS_ID)
  if (existing) return existing

  const now = new Date().toISOString()
  const record: AppSettings = {
    id: SETTINGS_ID,
    themes: [...DEFAULT_SETTINGS.themes],
    relevance_levels: [...DEFAULT_SETTINGS.relevance_levels],
    note_types: [...DEFAULT_SETTINGS.note_types],
    updated_at: now,
  }
  await db.settings.add(record)
  return record
}

/** Persist a full settings object (replaces the single record). */
export async function saveSettings(next: Omit<AppSettings, 'id' | 'updated_at'>): Promise<AppSettings> {
  const record: AppSettings = {
    id: SETTINGS_ID,
    themes: next.themes,
    relevance_levels: next.relevance_levels,
    note_types: next.note_types,
    updated_at: new Date().toISOString(),
  }
  await db.settings.put(record)
  return record
}
