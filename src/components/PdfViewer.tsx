import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
import type { PdfAnnotation, HighlightColor, Leitura, ReadingPdf } from '../types'
import { X, Trash2, StickyNote, Download, Highlighter } from 'lucide-react'

const COLOR_MAP: Record<HighlightColor, string> = {
  yellow: 'rgba(250, 208, 67, 0.45)',
  green: 'rgba(134, 239, 128, 0.45)',
  pink: 'rgba(248, 113, 113, 0.45)',
  blue: 'rgba(123, 173, 255, 0.45)',
}
const COLOR_SWATCH: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-green-300',
  pink: 'bg-rose-300',
  blue: 'bg-sky-300',
}

// Solid RGB triples (0-255) for the same highlight colors, used when baking
// highlights into a downloadable PDF (canvas fillStyle needs a solid color).
const COLOR_RGB: Record<HighlightColor, [number, number, number]> = {
  yellow: [250, 208, 67],
  green: [134, 239, 128],
  pink: [248, 113, 113],
  blue: [123, 173, 255],
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Bakes the highlight annotations into a NEW PDF so the downloaded file shows
// them. pdf-lib 1.17 can't add highlight annotations directly, so we render
// each annotated page (pdfjs) with the highlight rectangles drawn on top, then
// embed the rendered page as an image into a fresh pdf-lib document.
async function buildAnnotatedPdf(blob: Blob, annotations: PdfAnnotation[]): Promise<Blob> {
  const bytes = await blob.slice(0).arrayBuffer()
  const proxy = await pdfjsLib.getDocument({ data: bytes }).promise

  const byPage = new Map<number, PdfAnnotation[]>()
  for (const a of annotations) {
    if (!byPage.has(a.page)) byPage.set(a.page, [])
    byPage.get(a.page)!.push(a)
  }

  // Render at 2x for crisp embedded images; page size stays at scale-1 points.
  const RENDER_SCALE = 2

  const doc = await PDFDocument.create()
  for (let i = 1; i <= proxy.numPages; i++) {
    const page = await proxy.getPage(i)
    const vp = page.getViewport({ scale: RENDER_SCALE })
    const displayW = vp.width / RENDER_SCALE
    const displayH = vp.height / RENDER_SCALE

    const canvas = document.createElement('canvas')
    canvas.width = vp.width
    canvas.height = vp.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: vp }).promise

    for (const a of byPage.get(i) ?? []) {
      const rgb = COLOR_RGB[a.color] ?? COLOR_RGB.yellow
      ctx.globalAlpha = 0.45
      ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
      ctx.fillRect(
        (a.x / 100) * canvas.width,
        (a.y / 100) * canvas.height,
        (a.w / 100) * canvas.width,
        (a.h / 100) * canvas.height
      )
    }
    ctx.globalAlpha = 1.0

    const pngBytes = base64ToUint8Array(canvas.toDataURL('image/png').split(',')[1])
    const img = await doc.embedPng(pngBytes)
    const pdfPage = doc.addPage([displayW, displayH])
    pdfPage.drawImage(img, { x: 0, y: 0, width: displayW, height: displayH })
  }

  const savedBytes = await doc.save()
  return new Blob([savedBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

interface Props {
  reading: Leitura
  pdf: ReadingPdf | null
  annotations: PdfAnnotation[]
  onSave: (a: PdfAnnotation) => void
  onUpdate: (a: PdfAnnotation) => void
  onDelete: (id: string) => void
  onClose: () => void
}

interface PageInfo {
  pageNumber: number
  width: number
  height: number
}

interface Rect {
  pageNumber: number
  x1: number; y1: number; x2: number; y2: number
}

export default function PdfViewer({ reading, pdf, annotations, onSave, onUpdate, onDelete, onClose }: Props) {
  const [scale, setScale] = useState(1)
  const [highlighting, setHighlighting] = useState(false)
  const [color, setColor] = useState<HighlightColor>('yellow')
  const [pages, setPages] = useState<PageInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawing, setDrawing] = useState<Rect | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const overlayRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const noteRef = useRef<HTMLTextAreaElement | null>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!pdf) return
      setLoading(true); setError(null)
      try {
        // Read the blob into an ArrayBuffer. `slice(0)` yields a fresh,
        // unconsumed copy so the same stored Blob can be re-read on every
        // open/close of the viewer (a Blob's arrayBuffer() only works once).
        const buffer = await pdf.blob.slice(0).arrayBuffer()
        const proxy = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) return
        const numPages = proxy.numPages
        const infos: PageInfo[] = []
        for (let i = 1; i <= numPages; i++) {
          const page = await proxy.getPage(i)
          const vp = page.getViewport({ scale })
          infos.push({ pageNumber: i, width: vp.width, height: vp.height })
        }
        if (cancelled) return
        docRef.current = proxy
        setPages(infos)
      } catch (err: any) {
        if (!cancelled) setError(`Não foi possível abrir o PDF: ${err.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pdf, scale])

  // Render each page to its canvas AFTER the canvases are mounted.
  // (Rendering synchronously right after setPages() ran before the
  // canvas refs existed, leaving every page blank.)
  useEffect(() => {
    if (pages.length === 0 || !docRef.current) return
    let cancelled = false
    async function renderPages() {
      for (const info of pages) {
        if (cancelled) return
        const canvas = canvasRefs.current[info.pageNumber]
        if (!canvas) continue
        let page
        try {
          page = await docRef.current!.getPage(info.pageNumber)
        } catch {
          continue
        }
        const vp = page.getViewport({ scale })
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
      }
    }
    renderPages()
    return () => { cancelled = true }
  }, [pages, scale])

  function focusNote(id: string) {
    setFocusId(id)
    requestAnimationFrame(() => { noteRef.current?.focus() })
  }

  function toPercent(px: number, base: number) {
    return Math.max(0, Math.min(100, (px / base) * 100))
  }

  function startDrawing(pageNumber: number, e: React.PointerEvent) {
    const overlay = overlayRefs.current[pageNumber]
    if (!overlay || e.target !== overlay) return
    const rect = overlay.getBoundingClientRect()
    const x1 = toPercent(e.clientX - rect.left, rect.width)
    const y1 = toPercent(e.clientY - rect.top, rect.height)
    setDrawing({ pageNumber, x1, y1, x2: x1, y2: y1 })
  }

  function moveDrawing(e: React.PointerEvent) {
    if (!drawing) return
    const overlay = overlayRefs.current[drawing.pageNumber]
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()
    setDrawing({ ...drawing, x2: toPercent(e.clientX - rect.left, rect.width), y2: toPercent(e.clientY - rect.top, rect.height) })
  }

  function endDrawing(pageNumber: number, e: React.PointerEvent) {
    if (!drawing || drawing.pageNumber !== pageNumber) return
    const overlay = overlayRefs.current[pageNumber]
    if (!overlay) return
    const rect = overlay.getBoundingClientRect()
    // Start point (stored in percent at mousedown) vs. current end point.
    const x2 = toPercent(e.clientX - rect.left, rect.width)
    const y2 = toPercent(e.clientY - rect.top, rect.height)
    const rx = Math.min(drawing.x1, x2)
    const ry = Math.min(drawing.y1, y2)
    const rw = Math.abs(x2 - drawing.x1)
    const rh = Math.abs(y2 - drawing.y1)
    setDrawing(null)
    if (rw < 0.5 || rh < 0.5) return
    const ann: PdfAnnotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      id_leitura: reading.id,
      page: pageNumber,
      x: rx, y: ry, w: rw, h: rh,
      color,
      text: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    onSave(ann)
    focusNote(ann.id)
  }

  const sorted = useMemo(() =>
    [...annotations].sort((a: PdfAnnotation, b: PdfAnnotation) => a.page - b.page || a.y - b.y || a.x - b.x),
    [annotations]
  )

  if (!pdf) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
          <p className="text-sm text-slate-600">Esta leitura ainda não tem um ficheiro PDF.</p>
          <button onClick={onClose} className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{reading.id} — {reading.titulo}</p>
            <p className="text-xs text-slate-400">{pdf.filename}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-4 py-2 text-sm">
          <button
            onClick={() => setHighlighting((h) => !h)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${highlighting ? 'bg-amber-500 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <Highlighter className="h-4 w-4" /> Destacar
          </button>
          <div className="flex items-center gap-1">
            {(Object.keys(COLOR_MAP) as HighlightColor[]).map((c) => (
              <button key={c} onClick={() => setColor(c)} title={c}
                className={`h-5 w-5 rounded-full border ${c === color ? 'border-slate-800 ring-2 ring-slate-300' : 'border-slate-200'} ${COLOR_SWATCH[c]}`} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">–</button>
            <span className="w-12 text-center text-xs text-slate-500">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(2, s + 0.1))} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">+</button>
            <button
              onClick={async () => {
                if (!pdf) return
                try {
                  const annotated = await buildAnnotatedPdf(pdf.blob, annotations)
                  const url = URL.createObjectURL(annotated)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = pdf.filename.replace(/\.pdf$/i, '') + '_anotado.pdf'
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                } catch (err) {
                  console.error('Erro ao exportar PDF anotado:', err)
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
              <Download className="h-4 w-4" /> Download anotado
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 flex-1 md:grid-cols-[1fr_320px]">
          <div className="relative min-h-0 overflow-auto p-4">
            {loading && <p className="py-8 text-center text-sm text-slate-400">A carregar o PDF…</p>}
            {error && <p className="py-8 text-center text-sm text-rose-600">{error}</p>}
            {pages.map((p) => (
              <div key={p.pageNumber} className="mb-4 inline-block">
                <div className="relative" style={{ width: p.width, height: p.height }}
                  onPointerDown={(e) => startDrawing(p.pageNumber, e)}
                  onPointerMove={moveDrawing}
                  onPointerUp={(e) => endDrawing(p.pageNumber, e)}>
                  <canvas ref={(el) => { canvasRefs.current[p.pageNumber] = el }} className="block" />
                  <div ref={(el) => { overlayRefs.current[p.pageNumber] = el }}
                    className="absolute inset-0" style={{ cursor: highlighting ? 'crosshair' : 'default' }}>
                    {annotations.filter((a) => a.page === p.pageNumber).map((a) => (
                      <div key={a.id} onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => focusNote(a.id)}
                        style={{ position: 'absolute', left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%`, background: COLOR_MAP[a.color] }}
                        className="rounded-sm" />
                    ))}
                    {drawing && drawing.pageNumber === p.pageNumber && (
                      <div style={{ position: 'absolute', left: `${drawing.x1}%`, top: `${drawing.y1}%`, width: `${Math.abs(drawing.x2 - drawing.x1)}%`, height: `${Math.abs(drawing.y2 - drawing.y1)}%`, background: COLOR_MAP[color] }} className="rounded-sm pointer-events-none" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-center text-[10px] text-slate-400">Página {p.pageNumber}</p>
              </div>
            ))}
          </div>

          <div className="border-l border-slate-200 bg-slate-50 p-4 overflow-auto">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <StickyNote className="h-4 w-4 text-amber-500" /> Anotações ({annotations.length})
            </div>
            {sorted.length === 0 && <p className="text-xs text-slate-400">Sem destaques ainda. Ative «Destacar» e seleccione uma zona do PDF.</p>}
            <ul className="space-y-3">
              {sorted.map((a: PdfAnnotation) => (
                <li key={a.id} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${COLOR_SWATCH[a.color]}`} />
                    <span className="text-[10px] text-slate-400">Página {a.page}</span>
                    <span className="text-[10px] text-slate-400">({Math.round(a.x)}, {Math.round(a.y)})</span>
                    <button onClick={() => onDelete(a.id)} className="ml-auto text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <textarea
                    ref={a.id === focusId ? noteRef : null}
                    value={a.text}
                    onChange={(e) => onUpdate({ ...a, text: e.target.value, updated_at: new Date().toISOString() })}
                    placeholder="Escreva a sua nota aqui…"
                    className="h-20 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
