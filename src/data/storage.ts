// ============================================================================
// Import / Export: JSON full backup + per-sheet CSV.
// ============================================================================
import { db } from '../db'
import type { CollectionName } from '../types'
import { toCsvLine, fromCsvLine, download } from '../utils'
import type { Table } from 'dexie'
import {
  LEITURA_COLUMNS,
  NOTAS_NOVAS_COLUMNS,
  AUTORES_CITADOS_COLUMNS,
  POR_LER_COLUMNS,
  COORIENTADOR_COLUMNS,
  TAREFA_COLUMNS,
  LEITURA_ESTADOS,
  POR_LER_ESTADOS,
  COORIENTADOR_ESTADOS,
  A_CONFIRMAR_OPTIONS,
  ORIGEM_OPTIONS,
} from '../types'

interface SheetMeta {
  name: CollectionName
  label: string
  columns: typeof LEITURA_COLUMNS
  numericKeys: string[]
  optionKeys?: Record<string, readonly string[]>
}

const SHEETS: SheetMeta[] = [
  {
    name: 'leituras',
    label: 'LEITURAS',
    columns: LEITURA_COLUMNS,
    numericKeys: ['ano'],
    optionKeys: { estado: LEITURA_ESTADOS as unknown as readonly string[] },
  },
  {
    name: 'notas_novas',
    label: 'NOTAS NOVAS',
    columns: NOTAS_NOVAS_COLUMNS,
    numericKeys: [],
  },
  {
    name: 'autores_citados',
    label: 'AUTORES CITADOS',
    columns: AUTORES_CITADOS_COLUMNS,
    numericKeys: ['num_mencoes'],
    optionKeys: { contagem_confeida: A_CONFIRMAR_OPTIONS as unknown as readonly string[] },
  },
  {
    name: 'por_ler',
    label: 'POR LER',
    columns: POR_LER_COLUMNS,
    numericKeys: ['ano'],
    optionKeys: { origem: ORIGEM_OPTIONS as unknown as readonly string[], estado: POR_LER_ESTADOS as unknown as readonly string[] },
  },
  {
    name: 'coorientadores',
    label: 'COORIENTADORES',
    columns: COORIENTADOR_COLUMNS,
    numericKeys: [],
    optionKeys: { estado: COORIENTADOR_ESTADOS as unknown as readonly string[] },
  },
  {
    name: 'tarefas',
    label: 'TAREFAS',
    columns: TAREFA_COLUMNS,
    numericKeys: [],
  },
]

const SHEET_BY_NAME = new Map<SheetName, SheetMeta>()
type SheetName = (typeof SHEETS)[number]['name']
for (const s of SHEETS) SHEET_BY_NAME.set(s.name, s)

/** Build a CSV string for every sheet. */
export async function buildAllCSV(): Promise<string> {
  const blocks: string[] = []
  for (const sheet of SHEETS) {
    const all = await db[sheet.name].toArray()
    blocks.push(`# ${sheet.label}`)
    blocks.push(toCsvLine(sheet.columns.map((c) => c.label)))
    for (const rec of all) {
      const line = sheet.columns.map((c) => (rec as any)[c.key] ?? '')
      blocks.push(toCsvLine(line))
    }
    blocks.push('')
  }
  return blocks.join('\n')
}

/** Serialize every collection into a single JSON backup object. */
export async function buildJSONBackup(): Promise<string> {
  const payload: Record<string, any[]> = {}
  for (const sheet of SHEETS) {
    payload[sheet.label] = await db[sheet.name].toArray()
  }
  const backup = {
    app: 'caderno-digital-investigacao',
    version: 1,
    exported_at: new Date().toISOString(),
    data: payload,
  }
  return JSON.stringify(backup, null, 2)
}

export async function downloadCSV() {
  const csv = await buildAllCSV()
  download('caderno_backup.csv', csv, 'text/csv')
}

export function downloadJSON() {
  buildJSONBackup().then((json) => download(`caderno_backup_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json'))
}

export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/** Import a JSON backup (replaces all data). */
export async function importJSONBackup(json: string): Promise<{ imported: Record<string, number> }> {
  const parsed = JSON.parse(json)
  const data = parsed.data ?? parsed
  const imported: Record<string, number> = {}
  for (const sheet of SHEETS) {
    const rows = data[sheet.label] ?? []
    const table = db[sheet.name] as Table<any, string>
    await table.clear()
    const now = new Date().toISOString()
    const mapped = rows.map((r: any) => ({ ...r, created_at: r.created_at ?? now, updated_at: r.updated_at ?? now }))
    await table.bulkAdd(mapped)
    imported[sheet.label] = mapped.length
  }
  return { imported }
}

/** Import CSV text into a single collection. */
export async function importCSV(collection: CollectionName, csvText: string): Promise<{ added: number }> {
  const sheet = SHEET_BY_NAME.get(collection)
  if (!sheet) throw new Error(`Unknown collection ${collection}`)
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2) return { added: 0 }
  const header = fromCsvLine(lines[0])
  const now = new Date().toISOString()
  const out: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = fromCsvLine(lines[i])
    const obj: Record<string, any> = {}
    header.forEach((h, idx) => {
      const col = sheet.columns.find((c) => c.label === h)
      if (col) obj[col.key] = cells[idx]
    })
    if (!obj.id) obj.id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    out.push({ ...obj, created_at: now, updated_at: now })
  }
  await (db[collection] as Table<any, string>).bulkAdd(out)
  return { added: out.length }
}