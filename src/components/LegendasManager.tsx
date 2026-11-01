import { useEffect, useState } from 'react'
import { db } from '../db'
import type { Legenda } from '../types'
import { Save, Trash2, Plus, FileText } from 'lucide-react'

const HEADERS = [
  { key: 'marcacao_word', label: 'Marcação no Word' },
  { key: 'para_que_serve', label: 'Para que serve' },
  { key: 'como_registar', label: 'Como registar' },
  { key: 'nota', label: 'Nota' },
] as const

type Row = {
  id: string
  marcacao_word: string
  para_que_serve: string
  como_registar: string
  nota: string
}

/**
 * Editable manager of the "Regras do Jogo" (marking conventions).
 * Renders the legacy Legendas data as an inline-editable table: add, edit
 * and delete rows, persisted to IndexedDB.
 */
export default function LegendasManager() {
  const [items, setItems] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    db.legendas.toArray().then((rows) =>
      setItems(
        rows.map((r) => ({
          id: r.id,
          marcacao_word: r.marcacao_word,
          para_que_serve: r.para_que_serve,
          como_registar: r.como_registar,
          nota: r.nota,
        }))
      )
    )
  }, [])

  function setValue(index: number, key: keyof Row, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  }

  async function load() {
    const rows = await db.legendas.toArray()
    setItems(
      rows.map((r) => ({
        id: r.id,
        marcacao_word: r.marcacao_word,
        para_que_serve: r.para_que_serve,
        como_registar: r.como_registar,
        nota: r.nota,
      }))
    )
  }

  async function saveRow(index: number) {
    setBusy(true); setMessage(null)
    try {
      const row = items[index]
      const record: Legenda = {
        id: row.id,
        marcacao_word: row.marcacao_word,
        para_que_serve: row.para_que_serve,
        como_registar: row.como_registar,
        nota: row.nota,
      }
      if (record.id) {
        await db.legendas.put(record)
      } else {
        await db.legendas.add(record)
      }
      setMessage('Regra guardada.')
    } catch (err: any) {
      setMessage('Erro ao guardar: ' + err.message)
    } finally {
      setBusy(false)
    }
    await load()
  }

  async function removeRow(index: number) {
    if (!confirm('Eliminar esta regra?')) return
    const row = items[index]
    if (row.id) await db.legendas.delete(row.id)
    await load()
  }

  function addRow() {
    setItems((prev) => [...prev, { id: '', marcacao_word: '', para_que_serve: '', como_registar: '', nota: '' }])
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Regras do Jogo</h1>
        <p className="text-sm text-slate-500">
          Convenções de marcação no Word e como transladá-las para as notas do caderno. Podes adicionar, editar ou remover cada regra.
        </p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${message.includes('Erro') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <FileText className="h-4 w-4" /> {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {HEADERS.map((h) => <th key={h.key} className="px-3 py-2 font-semibold whitespace-nowrap">{h.label}</th>)}
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, index) => (
              <tr key={it.id || index} className="bg-amber-50/40">
                {HEADERS.map((h) => (
                  <td key={h.key} className="px-3 py-2">
                    <input
                      value={it[h.key]}
                      onChange={(e) => setValue(index, h.key, e.target.value)}
                      placeholder={h.label}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => saveRow(index)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-900 disabled:opacity-50">
                      <Save className="h-3.5 w-3.5" /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={HEADERS.length + 1} className="px-3 py-8 text-center text-slate-400">Sem regras registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Plus className="h-4 w-4" /> Nova regra
      </button>
    </div>
  )
}
