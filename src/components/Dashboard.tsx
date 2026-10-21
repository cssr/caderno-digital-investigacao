import { useEffect, useState } from 'react'
import { db } from '../db'
import { LEITURA_ESTADOS, POR_LER_ESTADOS } from '../types'
import { BookOpen, Users, ListChecks, StickyNote, Target, Clock, CheckCircle2 } from 'lucide-react'

interface Stats {
  leituras: number
  notas: number
  autores: number
  por_ler: number
  coorientadores: number
  tarefas: number
  leituras_by_estado: Record<string, number>
  por_ler_by_estado: Record<string, number>
  notas_by_tipo: Record<string, number>
  tarefas_by_category: Record<string, number>
  recent: Array<{ label: string; title: string; when: string }>
  top_autores: Array<{ autor: string; n: number }>
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${accent}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function BarChart({ data, color }: { data: Record<string, number>; color: string }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return (
    <div className="space-y-2">
      {entries.length === 0 && <p className="text-xs text-slate-400">Sem dados.</p>}
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{k}</span><span className="font-medium">{v}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
            <div className={`h-full rounded ${color}`} style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    db.leituras.toArray().then(async (leituras) => {
      const notas = await db.notas_novas.toArray()
      const autores = await db.autores_citados.toArray()
      const por_ler = await db.por_ler.toArray()
      const coorientadores = await db.coorientadores.toArray()
      const tarefas = await db.tarefas.toArray()

      const leituras_by_estado: Record<string, number> = {}
      for (const e of LEITURA_ESTADOS) leituras_by_estado[e] = 0
      for (const l of leituras) leituras_by_estado[l.estado] = (leituras_by_estado[l.estado] ?? 0) + 1

      const por_ler_by_estado: Record<string, number> = {}
      for (const e of POR_LER_ESTADOS) por_ler_by_estado[e] = 0
      for (const p of por_ler) por_ler_by_estado[p.estado] = (por_ler_by_estado[p.estado] ?? 0) + 1

      const notas_by_tipo: Record<string, number> = {}
      for (const n of notas) notas_by_tipo[n.tipo_nota] = (notas_by_tipo[n.tipo_nota] ?? 0) + 1

      const tarefas_by_category: Record<string, number> = {}
      for (const t of tarefas) tarefas_by_category[t.category] = (tarefas_by_category[t.category] ?? 0) + 1

      const recent: Array<{ label: string; title: string; when: string }> = []
      for (const l of leituras) recent.push({ label: 'Leitura', title: l.titulo, when: l.updated_at })
      for (const p of por_ler) recent.push({ label: 'Por ler', title: p.titulo_ficheiro, when: p.updated_at })
      for (const n of notas) recent.push({ label: 'Nota', title: (n.texto_idea || n.id_leitura).slice(0, 60), when: n.updated_at })
      recent.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      const recentTrimmed = recent.slice(0, 8)

      const autorCount = new Map<string, number>()
      for (const a of autores) autorCount.set(a.autor_citado, (autorCount.get(a.autor_citado) ?? 0) + 1)
      const top_autores = [...autorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([autor, n]) => ({ autor, n }))

      setStats({
        leituras: leituras.length,
        notas: notas.length,
        autores: autores.length,
        por_ler: por_ler.length,
        coorientadores: coorientadores.length,
        tarefas: tarefas.length,
        leituras_by_estado,
        por_ler_by_estado,
        notas_by_tipo,
        tarefas_by_category,
        recent: recentTrimmed,
        top_autores,
      })
    })
  }, [])

  if (!stats) return <div className="text-slate-400">A carregar o painel…</div>

  const inReading = stats.leituras_by_estado['Em leitura'] ?? 0
  const toReread = stats.leituras_by_estado['A reler'] ?? 0
  const pending = stats.tarefas_by_category['todo'] ?? 0
  const active = stats.tarefas_by_category['ongoing'] ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Painel de Investigação</h1>
        <p className="text-sm text-slate-500">Síntese do estado atual do caderno — atualizado em {new Date().toLocaleDateString('pt-PT')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={<BookOpen className="h-5 w-5 text-white" />} accent="bg-amber-500" label="Leituras" value={stats.leituras} />
        <StatCard icon={<StickyNote className="h-5 w-5 text-white" />} accent="bg-sky-500" label="Notas" value={stats.notas} />
        <StatCard icon={<Users className="h-5 w-5 text-white" />} accent="bg-violet-500" label="Autores citados" value={stats.autores} />
        <StatCard icon={<ListChecks className="h-5 w-5 text-white" />} accent="bg-emerald-500" label="Por ler" value={stats.por_ler} />
        <StatCard icon={<Target className="h-5 w-5 text-white" />} accent="bg-rose-500" label="Coorientadores" value={stats.coorientadores} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-white" />} accent="bg-slate-700" label="Tarefas" value={stats.tarefas} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><BookOpen className="h-4 w-4 text-amber-500" /> Estado das leituras</h2>
          <BarChart data={stats.leituras_by_estado} color="bg-amber-500" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><ListChecks className="h-4 w-4 text-emerald-500" /> Por ler</h2>
          <BarChart data={stats.por_ler_by_estado} color="bg-emerald-500" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><StickyNote className="h-4 w-4 text-sky-500" /> Notas por tipo</h2>
          <BarChart data={stats.notas_by_tipo} color="bg-sky-500" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-violet-500" /> Tarefas</h2>
          <BarChart data={stats.tarefas_by_category} color="bg-violet-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock className="h-4 w-4 text-rose-500" /> Adições recentes</h2>
          <ul className="space-y-2">
            {stats.recent.map((r, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-slate-50 pb-2 text-sm last:border-0">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{r.label}</span>
                <span className="line-clamp-1 text-slate-700">{r.title}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-slate-400">{new Date(r.when).toLocaleDateString('pt-PT')}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-violet-500" /> Autores mais mobilizados</h2>
          {stats.top_autores.length === 0 ? (
            <p className="text-xs text-slate-400">Ainda sem autores citados.</p>
          ) : (
            <ul className="space-y-2">
              {stats.top_autores.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{a.autor}</span>
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{a.n} menções</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-800">Foco para já</p>
        <p className="text-slate-600">
          {inReading > 0 && <span className="mr-4">{inReading} leitura(s) em curso.</span>}
          {toReread > 0 && <span className="mr-4">{toReread} para reler.</span>}
          {pending > 0 && <span className="mr-4">{pending} tarefa(s) por começar.</span>}
          {active > 0 && <span className="mr-4">{active} tarefa(s) em curso.</span>}
          {(inReading + toReread + pending + active) === 0 && <span>A investigação está por começar — adicione a primeira leitura.</span>}
        </p>
      </div>
    </div>
  )
}
