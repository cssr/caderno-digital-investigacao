import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import { getSettings } from '../data/settings'
import type { NotaNova, AppSettings } from '../types'
import { A_CONFIRMAR_OPTIONS } from '../types'
import { uid, norm } from '../utils'
import { Plus, Pencil, Trash2, Search, X, StickyNote, Filter, ListPlus, BookOpen } from 'lucide-react'

const A_CONFEIR_LABELS: Record<string, string> = {
  'Sim': 'Sim', 'Não': 'Não', 'Por confirmar': 'Por confirmar',
}
const A_CONFEIR_CLASS: Record<string, string> = {
  'Sim': 'bg-emerald-100 text-emerald-700',
  'Não': 'bg-rose-100 text-rose-700',
  'Por confirmar': 'bg-slate-100 text-slate-500',
}

export default function NotasView() {
  const [records, setRecords] = useState<NotaNova[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [readingMap, setReadingMap] = useState<Map<string, string> | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NotaNova | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Filters
  const [filterTipo, setFilterTipo] = useState('')
  const [filterTema, setFilterTema] = useState('')
  const [filterConfeir, setFilterConfeir] = useState('')
  const [groupBy, setGroupBy] = useState<'tipo_nota' | 'tema'>('tipo_nota')

  useEffect(() => { load() }, [])

  async function load() {
    const notas = await db.notas_novas.toArray()
    setRecords(notas)
    const s = await getSettings()
    setSettings(s)
    const leituras = await db.leituras.toArray()
    const map = new Map<string, string>()
    for (const l of leituras) map.set(l.id, `${l.id} — ${l.titulo}`)
    setReadingMap(map)
  }

  const initial = editing ? (editing as any) : {
    id: '', id_leitura: '', pagina_seccao: '', tipo_nota: '',
    texto_idea: '', tema: '', racoes_com_outros: '', data: '', a_confeir: '',
  }

  function resetForm() { setEditing(null); setFormOpen(false) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMessage(null)
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const payload: any = {
      id_leitura: data.id_leitura ?? '', pagina_seccao: data.pagina_seccao ?? '',
      tipo_nota: data.tipo_nota ?? '', texto_idea: data.texto_idea ?? '',
      tema: data.tema ?? '', racoes_com_outros: data.racoes_com_outros ?? '',
      data: data.data ?? '', a_confeir: data.a_confeir ?? '',
    }
    try {
      if (editing) {
        payload.id = editing.id
        payload.updated_at = new Date().toISOString()
        await db.notas_novas.put(payload)
        setMessage('Nota atualizada.')
      } else {
        payload.id = uid('N')
        payload.created_at = new Date().toISOString()
        payload.updated_at = new Date().toISOString()
        await db.notas_novas.add(payload)
        setMessage('Nota adicionada.')
      }
      resetForm(); load()
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`)
    } finally { setBusy(false) }
  }

  async function remove(row: NotaNova) {
    if (!confirm(`Eliminar a nota "${row.id}"?`)) return
    await db.notas_novas.delete(row.id)
    load()
  }

  const allTipo = useMemo(() => {
    const set = new Set<string>(settings?.note_types ?? [])
    for (const n of records) if (n.tipo_nota) set.add(n.tipo_nota)
    return [...set].sort()
  }, [records, settings])

  const allTema = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) if (r.tema) set.add(r.tema)
    return [...set].sort()
  }, [records])

  const filtered = useMemo(() => {
    let rows = records
    const q = norm(search)
    if (q) rows = rows.filter((r) => norm(`${r.id_leitura} ${r.pagina_seccao} ${r.tipo_nota} ${r.texto_idea} ${r.tema} ${r.racoes_com_outros}`).includes(q))
    if (filterTipo) rows = rows.filter((r) => r.tipo_nota === filterTipo)
    if (filterTema) rows = rows.filter((r) => r.tema === filterTema)
    if (filterConfeir) rows = rows.filter((r) => r.a_confeir === filterConfeir)
    return rows
  }, [records, search, filterTipo, filterTema, filterConfeir])

  const groups = useMemo(() => {
    const by = groupBy === 'tipo_nota' ? 'tipo_nota' : 'tema'
    const map = new Map<string, NotaNova[]>()
    const ungrouped: NotaNova[] = []
    for (const r of filtered) {
      const key = r[by] || '(sem ' + by + ')'
      if (key === '(sem ' + by + ')') ungrouped.push(r)
      else if (!map.has(key)) map.set(key, [r])
      else map.get(key)!.push(r)
    }
    return { map, ungrouped }
  }, [filtered, groupBy])

  const clearFilters = () => { setSearch(''); setFilterTipo(''); setFilterTema(''); setFilterConfeir('') }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notas</h1>
          <p className="text-sm text-slate-500">Sínteses, reflexões e perguntas, organizadas por tipo de nota e tema.</p>
        </div>
        <button onClick={() => { resetForm(); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
          <Plus className="h-4 w-4" /> Nova nota
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${message.includes('Erro') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      {formOpen && (
        <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{editing ? 'Editar nota' : 'Registar nova nota'}</h3>
            <button type="button" onClick={() => { resetForm(); setMessage(null) }} className="text-slate-400 hover:text-slate-600"><X /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">ID Leitura *</label>
              <input name="id_leitura" defaultValue={initial.id_leitura} required className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Página / Secção</label>
              <input name="pagina_seccao" defaultValue={initial.pagina_seccao} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de nota *</label>
              <select name="tipo_nota" defaultValue={initial.tipo_nota} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="">— —</option>
                {allTipo.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Data</label>
              <input name="data" type="date" defaultValue={initial.data} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Texto / Ideia escrita por mim;</label>
              <textarea name="texto_idea" defaultValue={initial.texto_idea} required rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Relações com outros textos</label>
              <textarea name="racoes_com_outros" defaultValue={initial.racoes_com_outros} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tema</label>
              <input name="tema" defaultValue={initial.tema} placeholder="Escolhe ou escreve um tema" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">A conferir?</label>
              <select name="a_confeir" defaultValue={initial.a_confeir} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="">— —</option>
                {A_CONFIRMAR_OPTIONS.map((o) => <option key={o} value={o}>{A_CONFEIR_LABELS[o] ?? o}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">{busy ? 'A guardar…' : 'Guardar'}</button>
            <button type="button" onClick={() => { resetForm(); setMessage(null) }} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Filter className="h-4 w-4" /> Filtros e agrupamento
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Por texto, tema…" className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de nota</label>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todos os tipos</option>
              {allTipo.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tema</label>
            <select value={filterTema} onChange={(e) => setFilterTema(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todos os temas</option>
              {allTema.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">A conferir?</label>
            <select value={filterConfeir} onChange={(e) => setFilterConfeir(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todos</option>
              {A_CONFIRMAR_OPTIONS.map((o) => <option key={o} value={o}>{A_CONFEIR_LABELS[o] ?? o}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Agrupar por:</span>
            <button onClick={() => setGroupBy('tipo_nota')} className={`rounded px-2 py-1 text-xs font-medium ${groupBy === 'tipo_nota' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Tipo de nota</button>
            <button onClick={() => setGroupBy('tema')} className={`rounded px-2 py-1 text-xs font-medium ${groupBy === 'tema' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Tema</button>
          </div>
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Limpar filtros</button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} nota(s) · {records.length} no total</p>

      {/* Groups */}
      {groups.map.size === 0 && groups.ungrouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">Nenhuma nota encontrada.</div>
      ) : (
        <div className="space-y-5">
          {Array.from(groups.map.entries()).map(([key, list]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <StickyNote className="h-4 w-4 text-amber-500" /> {key} ({list.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {list.map((n) => <NoteCard key={n.id} n={n} edit={() => { setEditing(n); setFormOpen(true) }} remove={remove} readingMap={readingMap} />)}
              </div>
            </div>
          ))}
          {groups.ungrouped.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-500">(Sem {groupBy}) ({groups.ungrouped.length})</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {groups.ungrouped.map((n) => <NoteCard key={n.id} n={n} edit={() => { setEditing(n); setFormOpen(true) }} remove={remove} readingMap={readingMap} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteCard({ n, edit, remove, readingMap }: { n: NotaNova; edit: () => void; remove: (n: NotaNova) => void; readingMap: Map<string, string> | null }) {
  const tipoClass = n.tipo_nota ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/40 p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {readingMap && n.id_leitura && readingMap.get(n.id_leitura) ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <BookOpen className="h-3 w-3 text-amber-500" />
              <span className="font-mono">{n.id_leitura}</span>
              <span className="text-slate-400 line-clamp-1">{readingMap.get(n.id_leitura)}</span>
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400">{n.id_leitura || '—'}</span>
          )}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tipoClass}`}>{n.tipo_nota || 'sem tipo'}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={edit} className="text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => remove(n)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <p className="mb-2 text-sm text-slate-700 line-clamp-3">{n.texto_idea}</p>
      <div className="flex flex-wrap items-center gap-2">
        {n.tema && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><ListPlus className="h-3 w-3" /> {n.tema}</span>}
        {n.a_confeir && <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${A_CONFEIR_CLASS[n.a_confeir] ?? 'bg-slate-100 text-slate-500'}`}>{A_CONFEIR_LABELS[n.a_confeir] ?? n.a_confeir}</span>}
        {n.data && <span className="text-[10px] text-slate-400">{n.data}</span>}
        {n.pagina_seccao && <span className="text-[10px] text-slate-400">p. {n.pagina_seccao}</span>}
      </div>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>
}
