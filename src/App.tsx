import { useEffect, useState } from 'react'
import { seedDatabase } from './data/seed'
import { COLLECTIONS } from './db'
import { getConfig } from './components/fields'
import {
  LEITURA_COLUMNS, NOTAS_NOVAS_COLUMNS, AUTORES_CITADOS_COLUMNS,
  POR_LER_COLUMNS, COORIENTADOR_COLUMNS,
} from './types'
import Dashboard from './components/Dashboard'
import CollectionManager from './components/CollectionManager'
import Tasks from './components/Tasks'
import DataHub from './components/DataHub'
import LegendasView from './components/LegendasView'
import type { CollectionName } from './types'
import { LayoutDashboard, BookOpen, StickyNote, Users, ListChecks, Target, FileText, CheckCircle2, HardDrive, Menu, X } from 'lucide-react'

type Section = 'dashboard' | 'legendas' | (typeof COLLECTIONS)[number] | 'tarefas' | 'datahub'

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'leituras', label: 'Leituras', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'notas_novas', label: 'Notas', icon: <StickyNote className="h-4 w-4" /> },
  { id: 'autores_citados', label: 'Autores', icon: <Users className="h-4 w-4" /> },
  { id: 'por_ler', label: 'Por Ler', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'coorientadores', label: 'Coorientadores', icon: <Target className="h-4 w-4" /> },
  { id: 'legendas', label: 'Legendas', icon: <FileText className="h-4 w-4" /> },
  { id: 'tarefas', label: 'Tarefas', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'datahub', label: 'Backup', icon: <HardDrive className="h-4 w-4" /> },
]

const COLUMNS: Record<string, typeof LEITURA_COLUMNS> = {
  leituras: LEITURA_COLUMNS,
  notas_novas: NOTAS_NOVAS_COLUMNS,
  autores_citados: AUTORES_CITADOS_COLUMNS,
  por_ler: POR_LER_COLUMNS,
  coorientadores: COORIENTADOR_COLUMNS,
}

export default function App() {
  const [section, setSection] = useState<Section>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    seedDatabase().catch(() => {})
  }, [])

  const active = NAV.find((n) => n.id === section)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-700">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-slate-800">Caderno de Investigação</p>
              <p className="text-[11px] text-slate-400">Investigação Recomeçar · recolha &amp; síntese digital</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen((o) => !o)} className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 lg:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="lg:hidden">
          {mobileOpen && (
            <div className="max-w-6xl space-y-1 px-4 pb-3">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setSection(n.id); setMobileOpen(false) }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${section === n.id ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {n.icon}{n.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {NAV.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSection(n.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${section === n.id ? 'bg-amber-50 text-amber-700 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {n.icon}{n.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="mb-4 flex items-center gap-2 rounded-md bg-slate-50 px-4 py-2 text-sm text-slate-500 lg:hidden">
              {active?.icon} {active?.label}
            </div>

            {section === 'dashboard' && <Dashboard />}
            {section === 'tarefas' && <Tasks />}
            {section === 'datahub' && <DataHub />}
            {section === 'legendas' && <LegendasView />}
            {(section !== 'dashboard' && section !== 'legendas' && section !== 'tarefas' && section !== 'datahub') && (
  <CollectionManager config={getConfig(section as CollectionName)!} columns={COLUMNS[section]} />
)}
          </main>
        </div>
      </div>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
        Caderno digital · persistido localmente via IndexedDB · dados inspirados na planilha de recolha
      </footer>
    </div>
  )
}
