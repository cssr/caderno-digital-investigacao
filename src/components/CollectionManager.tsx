import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { AnyRecord, ColumnDef } from '../types'
import type { CollectionConfig, FieldType } from './fields'
import { uid, formatDate, norm } from '../utils'
import { Plus, Pencil, Trash2, Search, X, BookOpen } from 'lucide-react'

interface Props {
  config: CollectionConfig
  columns: ColumnDef[]
  extraColumns?: ColumnDef[]
}

export default function CollectionManager({ config, columns, extraColumns }: Props) {
  const [records, setRecords] = useState<AnyRecord[]>([])
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AnyRecord | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [config.name])

  async function load() {
    const rows = await db[config.name].toArray()
    setRecords(rows as AnyRecord[])
  }

  const filtered = useMemo(() => {
    const q = norm(search)
    if (!q) return records
    return records.filter((r) =>
      columns.some((c) => norm(String((r as any)[c.key] ?? '')).includes(q))
    )
  }, [records, search, columns])

  const [readingMap, setReadingMap] = useState<Map<string, string> | null>(null)
  useEffect(() => {
    ;(async () => {
      const leituras = await db.leituras.toArray()
      const map = new Map<string, string>()
      for (const l of leituras) map.set(l.id, `${l.id} — ${l.titulo}`)
      setReadingMap(map)
    })()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const payload: any = {}
    for (const f of config.fields) {
      payload[f.key] = data[f.key] ?? ''
    }
    if (editing) {
      payload.id = editing.id
      payload.updated_at = new Date().toISOString()
      await db[config.name].put(payload)
    } else {
      payload.id = uid(config.name)
      payload.created_at = new Date().toISOString()
      payload.updated_at = new Date().toISOString()
      await db[config.name].add(payload)
    }
    setFormOpen(false)
    setEditing(null)
    load()
    setBusy(false)
  }

  function editRow(row: AnyRecord) { setEditing(row); setFormOpen(true) }

  async function remove(row: AnyRecord) {
    if (!confirm(`Eliminar ${config.title.toLowerCase()} "${(row as any).id}"?`)) return
    await db[config.name].delete(row.id)
    if (config.name === 'leituras') {
      await db.notas_novas.where('id_leitura').equals(row.id).delete()
      await db.autores_citados.where('id_leitura').equals(row.id).delete()
    }
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar…"
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> Nova {config.title.replace(/s$/, '')}
        </button>
      </div>

      {formOpen && (
        <FormPanel
          config={config}
          editing={editing}
          onSave={save}
          onCancel={() => { setFormOpen(false); setEditing(null) }}
          busy={busy}
        />
      )}

      <TableView records={filtered} columns={columns} extraColumns={extraColumns} editRow={editRow} remove={remove} readingMap={readingMap} />

      <p className="text-xs text-slate-400">{filtered.length} registo(s) · {records.length} no total</p>
    </div>
  )
}

function FormPanel({ config, editing, onSave, onCancel, busy }: {
  config: CollectionConfig
  editing: AnyRecord | null
  onSave: (e: React.FormEvent) => void
  onCancel: () => void
  busy: boolean
}) {
  const initial = editing ? (editing as any) : Object.fromEntries(config.fields.map((f) => [f.key, f.type === 'number' ? '' : '']))
  return (
    <form onSubmit={onSave} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{editing ? 'Editar' : 'Registar novo'} — {config.title}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {config.fields.map((f) => (
          <FieldInput key={f.key} field={f} initial={(initial as any)[f.key]} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
          {busy ? 'A guardar…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  )
}

function FieldInput({ field, initial }: {
  field: { key: string; label: string; type: FieldType; options?: string[]; required?: boolean }
  initial: string | number | null
}) {
  const options = field.options ?? []
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'select' ? (
        <select
          name={field.key}
          defaultValue={initial ?? ''}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">— —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === 'link' ? (
        <input
          type="url"
          name={field.key}
          value={initial ?? ''}
          placeholder="https://…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      ) : field.type === 'date' ? (
        <input
          type="date"
          name={field.key}
          value={initial ? formatDate(initial) : ''}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          name={field.key}
          value={initial ?? ''}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      )}
    </div>
  )
}

function TableView({ records, columns, extraColumns, editRow, remove, readingMap }: {
  records: AnyRecord[]
  columns: ColumnDef[]
  extraColumns?: ColumnDef[]
  editRow: (r: AnyRecord) => void
  remove: (r: AnyRecord) => void
  readingMap: Map<string, string> | null
}) {
  const cols = [...columns, ...(extraColumns ?? [])]
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {cols.map((c) => <th key={c.key} className="px-3 py-2 font-semibold whitespace-nowrap">{c.label}</th>)}
            <th className="px-3 py-2 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.length === 0 && (
            <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-slate-400">Sem registos.</td></tr>
          )}
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              {cols.map((c) => <Cell key={c.key} record={r} col={c} readingMap={readingMap} />)}
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button onClick={() => editRow(r)} className="text-slate-400 hover:text-slate-700 mr-2"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(r)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ record, col, readingMap }: { record: AnyRecord; col: ColumnDef; readingMap: Map<string, string> | null }) {
  const val = (record as any)[col.key]
  const display = col.type === 'date' ? formatDate(val) : col.type === 'number' ? (val == null ? '' : String(val)) : String(val ?? '')

  if (col.key === 'id_leitura' && readingMap && val) {
    return <td className="px-3 py-2"><LinkToReading id={String(val)} readingMap={readingMap} /></td>
  }

  if ((col.key === 'fonte_link' || col.key === 'referencia_apa') && /^https?:/.test(String(display))) {
    return <td className="px-3 py-2"><a href={display} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline line-clamp-1">{display}</a></td>
  }

  return <td className="px-3 py-2 whitespace-nowrap text-slate-700">{display}</td>
}

function LinkToReading({ id, readingMap }: { id: string; readingMap: Map<string, string> | null }) {
  const title = readingMap?.get(id)
  if (!title) return <span className="font-mono text-slate-600">{id}</span>
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <BookOpen className="h-3 w-3 text-amber-500" />
      <span className="font-mono">{id}</span>
      <span className="text-slate-400 line-clamp-1">{title}</span>
    </span>
  )
}