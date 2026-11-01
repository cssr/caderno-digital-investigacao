import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db'
import { getSettingsWithDefaults } from '../data/settings'
import type { Leitura, AppSettings, NotaNova, ReadingPdf, PdfAnnotation } from '../types'
import { uid, norm } from '../utils'
import PdfViewer from './PdfViewer'
import { Plus, Pencil, Trash2, Search, X, BookOpen, Filter, ListPlus, StickyNote, FileText, Upload } from 'lucide-react'

const ESTADOS = ['Em leitura', 'A reler', 'Lido', 'Arquivado']
const ESTADO_CLASS: Record<string, string> = {
  'Em leitura': 'bg-sky-100 text-sky-700',
  'A reler': 'bg-amber-100 text-amber-700',
  'Lido': 'bg-emerald-100 text-emerald-700',
  'Arquivado': 'bg-slate-100 text-slate-500',
}

const ESTADO_LABELS: Record<string, string> = {
  'Em leitura': 'Em leitura', 'A reler': 'A reler', 'Lido': 'Lido', 'Arquivado': 'Arquivado',
}

export default function LeiturasView() {
  const [records, setRecords] = useState<Leitura[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [notasMap, setNotasMap] = useState<Map<string, NotaNova[]>>(new Map())
  const [pdfMap, setPdfMap] = useState<Map<string, ReadingPdf>>(new Map())
  const [annotationMap, setAnnotationMap] = useState<Map<string, PdfAnnotation[]>>(new Map())
  const [activePdf, setActivePdf] = useState<{ pdf: ReadingPdf; annotations: PdfAnnotation[] } | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Leitura | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFor, setUploadFor] = useState<string | null>(null)

  // Filters
  const [filterTema, setFilterTema] = useState('')
  const [filterRelev, setFilterRelev] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [groupBy, setGroupBy] = useState<'tema' | 'relevancia'>('tema')

  useEffect(() => { load() }, [])

  async function load() {
    const leituras = await db.leituras.toArray()
    setRecords(leituras)
    const s = await getSettingsWithDefaults()
    setSettings(s)
    const notas = await db.notas_novas.toArray()
    const notasMap = new Map<string, NotaNova[]>()
    for (const n of notas) {
      const key = n.id_leitura
      if (!notasMap.has(key)) notasMap.set(key, [])
      notasMap.get(key)!.push(n)
    }
    setNotasMap(notasMap)

    const pdfs = await db.pdfs.toArray()
    const pdfMap = new Map<string, ReadingPdf>()
    for (const p of pdfs) pdfMap.set(p.id_leitura, p)
    setPdfMap(pdfMap)

    const anns = await db.annotations.toArray()
    const annMap = new Map<string, PdfAnnotation[]>()
    for (const a of anns) {
      const key = a.id_leitura
      if (!annMap.has(key)) annMap.set(key, [])
      annMap.get(key)!.push(a)
    }
    setAnnotationMap(annMap)
  }

  async function uploadPdf(id: string, file: File) {
    setBusy(true); setMessage(null)
    try {
      const existing = await db.pdfs.where('id_leitura').equals(id).toArray()
      for (const old of existing) await db.pdfs.delete(old.id)
      const record: ReadingPdf = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        id_leitura: id,
        filename: file.name,
        uploaded_at: new Date().toISOString(),
        blob: file,
      }
      await db.pdfs.add(record)
      await load()
      setMessage('PDF guardado nesta leitura.')
    } catch (err: any) {
      setMessage(`Erro ao guardar o PDF: ${err.message}`)
    } finally { setBusy(false) }
    setUploadFor(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removePdf(id: string) {
    if (!confirm(`Eliminar o PDF desta leitura?`)) return
    await db.pdfs.where('id_leitura').equals(id).delete()
    await db.annotations.where('id_leitura').equals(id).delete()
    if (activePdf && activePdf.pdf.id_leitura === id) setActivePdf(null)
    await load()
    setMessage('PDF eliminado.')
  }

  function openViewer(id: string) {
    const pdf = pdfMap.get(id)
    if (!pdf) return
    setActivePdf({ pdf, annotations: annotationMap.get(id) ?? [] })
  }

  function saveAnnotation(a: PdfAnnotation) {
    a.created_at = new Date().toISOString()
    a.updated_at = new Date().toISOString()
    db.annotations.add(a).then(() => {
      setAnnotationMap((prev) => {
        const next = new Map(prev)
        const list = next.get(a.id_leitura) ?? []
        next.set(a.id_leitura, [...list, a])
        return next
      })
      if (activePdf && activePdf.pdf.id_leitura === a.id_leitura) setActivePdf({ ...activePdf, annotations: [...activePdf.annotations, a] })
    })
  }

  function updateAnnotation(a: PdfAnnotation) {
    a.updated_at = new Date().toISOString()
    db.annotations.put(a).then(() => {
      setAnnotationMap((prev) => {
        const next = new Map(prev)
        const list = next.get(a.id_leitura) ?? []
        next.set(a.id_leitura, list.map((x) => (x.id === a.id ? a : x)))
        return next
      })
      if (activePdf && activePdf.pdf.id_leitura === a.id_leitura) setActivePdf({ ...activePdf, annotations: activePdf.annotations.map((x) => (x.id === a.id ? a : x)) })
    })
  }

  function deleteAnnotation(id: string) {
    db.annotations.delete(id).then(() => {
      setAnnotationMap((prev) => {
        const next = new Map(prev)
        for (const [k, list] of next) {
          const filtered = list.filter((x) => x.id !== id)
          if (filtered.length) next.set(k, filtered); else next.delete(k)
        }
        return next
      })
      if (activePdf) setActivePdf({ ...activePdf, annotations: activePdf.annotations.filter((a) => a.id !== id) })
    })
  }

  const initial = editing ? (editing as any) : {
    id: '', autores: '', ano: null, titulo: '', referencia_apa: '',
    problematica: '', tese: '', estado: 'Em leitura', fonte_link: '',
    conferencias: '', tema: '', relevancia: '',
  }

  function resetForm() { setEditing(null); setFormOpen(false) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMessage(null)
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const payload: any = {
      autores: data.autores ?? '', ano: data.ano && Number(data.ano) ? Number(data.ano) : null,
      titulo: data.titulo ?? '', referencia_apa: data.referencia_apa ?? '',
      problematica: data.problematica ?? '', tese: data.tese ?? '',
      estado: data.estado ?? 'Em leitura', fonte_link: data.fonte_link ?? '',
      conferencias: data.conferencias ?? '', tema: data.tema ?? '', relevancia: data.relevancia ?? '',
    }
    try {
      if (editing) {
        payload.id = editing.id
        payload.updated_at = new Date().toISOString()
        await db.leituras.put(payload)
        setMessage('Leitura atualizada.')
      } else {
        payload.id = uid('L')
        payload.created_at = new Date().toISOString()
        payload.updated_at = new Date().toISOString()
        await db.leituras.add(payload)
        setMessage('Leitura adicionada.')
      }
      resetForm(); load()
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`)
    } finally { setBusy(false) }
  }

  async function remove(row: Leitura) {
    if (!confirm(`Eliminar a leitura "${row.id}"? Todas as notas, PDFs e anotações associados serão eliminados.`)) return
    await db.notas_novas.where('id_leitura').equals(row.id).delete()
    await db.autores_citados.where('id_leitura').equals(row.id).delete()
    await db.pdfs.where('id_leitura').equals(row.id).delete()
    await db.annotations.where('id_leitura').equals(row.id).delete()
    await db.leituras.delete(row.id)
    load()
  }

  const allTema = useMemo(() => {
    const set = new Set<string>(settings?.themes ?? [])
    for (const r of records) if (r.tema) set.add(r.tema)
    return [...set].sort()
  }, [records, settings])

  const allRelev = useMemo(() => {
    const set = new Set<string>(settings?.relevance_levels ?? [])
    for (const r of records) if (r.relevancia) set.add(r.relevancia)
    return [...set].sort()
  }, [records, settings])

  const filtered = useMemo(() => {
    let rows = records
    const q = norm(search)
    if (q) rows = rows.filter((r) => norm(`${r.id} ${r.autores} ${r.titulo} ${r.problematica} ${r.tese} ${r.tema} ${r.relevancia}`).includes(q))
    if (filterTema) rows = rows.filter((r) => r.tema === filterTema)
    if (filterRelev) rows = rows.filter((r) => r.relevancia === filterRelev)
    if (filterEstado) rows = rows.filter((r) => r.estado === filterEstado)
    return rows
  }, [records, search, filterTema, filterRelev, filterEstado])

  const groups = useMemo(() => {
    const by = groupBy === 'tema' ? 'tema' : 'relevancia'
    const map = new Map<string, Leitura[]>()
    const ungrouped: Leitura[] = []
    for (const r of filtered) {
      const key = r[by] || '(sem ' + by + ')'
      if (key === '(sem ' + by + ')') ungrouped.push(r)
      else if (!map.has(key)) map.set(key, [r])
      else map.get(key)!.push(r)
    }
    return { map, ungrouped }
  }, [filtered, groupBy])

  const clearFilters = () => { setSearch(''); setFilterTema(''); setFilterRelev(''); setFilterEstado('') }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leituras</h1>
          <p className="text-sm text-slate-500">Leituras já trabalhadas, organizadas por tema e relevância.</p>
        </div>
        <button onClick={() => { resetForm(); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">
          <Plus className="h-4 w-4" /> Nova leitura
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
            <h3 className="text-sm font-semibold text-slate-700">{editing ? 'Editar leitura' : 'Registar nova leitura'}</h3>
            <button type="button" onClick={() => { resetForm(); setMessage(null) }} className="text-slate-400 hover:text-slate-600"><X /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">ID *</label>
              <input name="id" defaultValue={initial.id} required className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Autor(es) *</label>
              <input name="autores" defaultValue={initial.autores} required className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ano</label>
              <input name="ano" type="number" defaultValue={initial.ano ?? ''} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
              <select name="estado" defaultValue={initial.estado} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
                {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Título / Texto *</label>
              <textarea name="titulo" defaultValue={initial.titulo} required rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Referência APA 7</label>
              <textarea name="referencia_apa" defaultValue={initial.referencia_apa} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Problemática (provisória)</label>
              <textarea name="problematica" defaultValue={initial.problematica} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Tese / Ideia central (provisória)</label>
              <textarea name="tese" defaultValue={initial.tese} rows={2} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Fonte / Link</label>
              <input name="fonte_link" defaultValue={initial.fonte_link} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Conferências</label>
              <input name="conferencias" defaultValue={initial.conferencias} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tema</label>
              <input name="tema" list="temas-leitura" defaultValue={initial.tema} placeholder="Escolhe ou escreve um tema" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <datalist id="temas-leitura">{allTema.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Relevância</label>
              <input name="relevancia" list="relevancias-leitura" defaultValue={initial.relevancia} placeholder="Escolhe um nível de relevância" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <datalist id="relevancias-leitura">{allRelev.map((r) => <option key={r} value={r} />)}</datalist>
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Por título, autor…" className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tema</label>
            <select value={filterTema} onChange={(e) => setFilterTema(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todos os temas</option>
              {allTema.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Relevância</label>
            <select value={filterRelev} onChange={(e) => setFilterRelev(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todas as relevâncias</option>
              {allRelev.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500">
              <option value="">Todos os estados</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Agrupar por:</span>
            <button onClick={() => setGroupBy('tema')} className={`rounded px-2 py-1 text-xs font-medium ${groupBy === 'tema' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Tema</button>
            <button onClick={() => setGroupBy('relevancia')} className={`rounded px-2 py-1 text-xs font-medium ${groupBy === 'relevancia' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Relevância</button>
          </div>
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-slate-600">Limpar filtros</button>
        </div>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} leitura(s) · {records.length} no total</p>

      {/* Groups */}
      {groups.map.size === 0 && groups.ungrouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">Nenhuma leitura encontrada.</div>
      ) : (
        <div className="space-y-5">
          {Array.from(groups.map.entries()).map(([key, list]) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <ListPlus className="h-4 w-4 text-amber-500" /> {key} ({list.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {list.map((r) => <ReadingCard key={r.id} r={r} edit={() => { setEditing(r); setFormOpen(true) }} remove={remove} notasMap={notasMap} pdf={pdfMap.get(r.id) ?? null} annotationCount={annotationMap.get(r.id)?.length ?? 0} onOpen={() => openViewer(r.id)} onUpload={() => setUploadFor(r.id)} onRemovePdf={() => removePdf(r.id)} />)}
              </div>
            </div>
          ))}
          {groups.ungrouped.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-500">(Sem {groupBy}) ({groups.ungrouped.length})</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {groups.ungrouped.map((r) => <ReadingCard key={r.id} r={r} edit={() => { setEditing(r); setFormOpen(true) }} remove={remove} notasMap={notasMap} pdf={pdfMap.get(r.id) ?? null} annotationCount={annotationMap.get(r.id)?.length ?? 0} onOpen={() => openViewer(r.id)} onUpload={() => setUploadFor(r.id)} onRemovePdf={() => removePdf(r.id)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {uploadFor && (
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(uploadFor, f) }} />
      )}

      {activePdf && (
        <PdfViewer
          reading={records.find((r) => r.id === activePdf.pdf.id_leitura)!}
          pdf={activePdf.pdf}
          annotations={activePdf.annotations}
          onSave={saveAnnotation}
          onUpdate={updateAnnotation}
          onDelete={deleteAnnotation}
          onClose={() => setActivePdf(null)}
        />
      )}
    </div>
  )
}

function ReadingCard({ r, edit, remove, notasMap, pdf, annotationCount, onOpen, onUpload, onRemovePdf }: {
  r: Leitura
  edit: () => void
  remove: (r: Leitura) => void
  notasMap: Map<string, NotaNova[]>
  pdf: ReadingPdf | null
  annotationCount: number
  onOpen: () => void
  onUpload: () => void
  onRemovePdf: () => void
}) {
  const temaClass = r.tema ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'
  const relevClass = r.relevancia ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
  const notas = notasMap.get(r.id) ?? []
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/40 p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{r.id}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ESTADO_CLASS[r.estado] ?? 'bg-slate-100 text-slate-500'}`}>{ESTADO_LABELS[r.estado] ?? r.estado}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={edit} className="text-slate-400 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => remove(r)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{r.titulo}</p>
      <p className="mb-2 text-xs text-slate-500">{r.autores}{r.ano ? ` (${r.ano})` : ''}</p>
      {r.tese && <p className="mb-2 text-xs text-slate-600 line-clamp-2">{r.tese}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${temaClass}`}><ListPlus className="h-3 w-3" /> {r.tema || 'sem tema'}</span>
        {r.relevancia && <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${relevClass}`}><BookOpen className="h-3 w-3" /> {r.relevancia}</span>}
        {r.fonte_link && /^https?:/.test(r.fonte_link) && <a href={r.fonte_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">Fonte ↗</a>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={onUpload} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
          <Upload className="h-3.5 w-3.5" /> {pdf ? 'Substituir PDF' : 'Upload PDF'}
        </button>
        <button onClick={onOpen} disabled={!pdf} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
          <FileText className="h-3.5 w-3.5" /> {pdf ? 'Abrir PDF' : 'Ver PDF'}
        </button>
        {annotationCount > 0 && <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700"><StickyNote className="h-3 w-3" /> {annotationCount} destaque(s)</span>}
        {pdf && <button onClick={onRemovePdf} className="ml-auto text-slate-400 hover:text-red-600" title="Eliminar PDF"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>
      {notas.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-sky-600">
            <StickyNote className="h-3 w-3" /> {notas.length} nota(s)
          </div>
          <ul className="space-y-1">
            {notas.map((n) => (
              <li key={n.id} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="shrink-0 rounded bg-sky-50 px-1 py-0.5 font-medium text-sky-700">{n.tipo_nota}</span>
                <span className="line-clamp-2">{n.texto_idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>
}
