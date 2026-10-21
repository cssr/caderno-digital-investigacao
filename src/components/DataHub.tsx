import { useState } from 'react'
import {
  downloadJSON, downloadCSV,
  readJSONFile, readCSVFile, importJSONBackup, importCSV,
} from '../data/storage'
import type { CollectionName } from '../types'
import { Download, Upload, FileJson, FileSpreadsheet, Check, Loader2 } from 'lucide-react'

const COLLECTIONS: { key: CollectionName; label: string }[] = [
  { key: 'leituras', label: 'LEITURAS' },
  { key: 'notas_novas', label: 'NOTAS NOVAS' },
  { key: 'autores_citados', label: 'AUTORES CITADOS' },
  { key: 'por_ler', label: 'POR LER' },
  { key: 'coorientadores', label: 'COORIENTADORES' },
  { key: 'tarefas', label: 'TAREFAS' },
]

export default function DataHub() {
  const [busy, setBusy] = useState(false)
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvCollection, setCsvCollection] = useState<CollectionName>('leituras')
  const [message, setMessage] = useState<string | null>(null)

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
