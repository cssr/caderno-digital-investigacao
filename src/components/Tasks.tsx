import { useEffect, useState } from 'react'
import { db } from '../db'
import type { Tarefa, TaskCategory, TaskPriority } from '../types'
import { TASK_CATEGORY_LABELS, TASK_PRIORITY_LABELS } from '../types'
import { uid, formatDate, norm } from '../utils'
import { Plus, Pencil, Trash2, CheckCircle2, Clock, ListTodo, Search, X } from 'lucide-react'

const COLUMNS: { key: TaskCategory; icon: React.ReactNode; accent: string }[] = [
  { key: 'todo', icon: <ListTodo className="h-4 w-4" />, accent: 'from-slate-500 to-slate-600' },
  { key: 'ongoing', icon: <Clock className="h-4 w-4" />, accent: 'from-amber-500 to-amber-600' },
  { key: 'complete', icon: <CheckCircle2 className="h-4 w-4" />, accent: 'from-emerald-500 to-emerald-600' },
]

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-rose-100 text-rose-700',
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Tarefa[]>([])
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tarefa | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() { setTasks(await db.tarefas.toArray()) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const payload: any = {
      title: data.title ?? '',
      description: data.description ?? '',
      category: data.category as TaskCategory,
      priority: data.priority as TaskPriority,
      due_date: data.due_date ?? '',
      related_id: data.related_id ?? '',
    }
    if (editing) {
      payload.id = editing.id
      payload.updated_at = new Date().toISOString()
      await db.tarefas.put(payload)
    } else {
      payload.id = uid('task')
      payload.created_at = new Date().toISOString()
      payload.updated_at = new Date().toISOString()
      await db.tarefas.add(payload)
    }
    setFormOpen(false); setEditing(null); load(); setBusy(false)
  }

  async function remove(t: Tarefa) {
    if (!confirm('Eliminar esta tarefa?')) return
    await db.tarefas.delete(t.id)
    load()
  }

  const filtered = search ? tasks.filter((t) =>
    norm(`${t.title} ${t.description} ${t.related_id}`).includes(norm(search))
  ) : tasks

  const byCategory = (cat: TaskCategory) => filtered.filter((t) => t.category === cat)

  const initial = editing ? editing : {
    id: '', title: '', description: '', category: 'todo' as TaskCategory,
    priority: 'media' as TaskPriority, due_date: '', related_id: '',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Tarefas</h1>
          <p className="text-sm text-slate-500">Itens organizados em To-do, On-going e Complete.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar tarefas…"
              className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button onClick={() => { setEditing(null); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
            <Plus className="h-4 w-4" /> Nova tarefa
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{editing ? 'Editar tarefa' : 'Nova tarefa'}</h3>
            <button type="button" onClick={() => { setFormOpen(false); setEditing(null) }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Título *</label>
              <input name="title" defaultValue={initial.title} required className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Categoria</label>
              <select name="category" defaultValue={initial.category} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{TASK_CATEGORY_LABELS[c.key]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Prioridade</label>
              <select name="priority" defaultValue={initial.priority} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Prazo</label>
              <input name="due_date" type="date" defaultValue={initial.due_date ? formatDate(initial.due_date) : ''} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Descrição</label>
              <textarea name="description" defaultValue={initial.description} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Ligação (ID de leitura / referência)</label>
              <input name="related_id" defaultValue={initial.related_id} placeholder="ex: L001" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
              {busy ? 'A guardar…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); setEditing(null) }} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className={`mb-3 flex items-center gap-2 rounded-md bg-gradient-to-r px-3 py-2 text-white ${col.accent}`}>
              {col.icon}
              <span className="text-sm font-semibold">{TASK_CATEGORY_LABELS[col.key]}</span>
              <span className="ml-auto rounded bg-white/20 px-2 py-0.5 text-xs">{byCategory(col.key).length}</span>
            </div>
            <div className="space-y-2">
              {byCategory(col.key).length === 0 && <p className="py-6 text-center text-xs text-slate-400">Vazio</p>}
              {byCategory(col.key).map((t) => (
                <TaskCard key={t.id} t={t} edit={() => { setEditing(t); setFormOpen(true) }} remove={remove} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({ t, edit, remove }: { t: Tarefa; edit: () => void; remove: (t: Tarefa) => void }) {
  const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toISOString().slice(0, 10)) && t.category !== 'complete'
  return (
    <div className={`rounded-md border bg-white p-3 shadow-sm ${(overdue ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200')}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">{t.title}</p>
          {t.description && <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={edit} className="text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_CLASS[t.priority]}`}>{TASK_PRIORITY_LABELS[t.priority]}</span>
        {t.due_date && (
          <span className={`inline-flex items-center gap-1 text-[10px] ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
            <Clock className="h-3 w-3" /> {formatDate(t.due_date)}{overdue ? ' · em atraso' : ''}
          </span>
        )}
        {t.related_id && <span className="font-mono text-[10px] text-amber-600">{t.related_id}</span>}
      </div>
    </div>
  )
}
