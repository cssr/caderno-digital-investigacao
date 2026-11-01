import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../data/settings'
import type { AppSettings } from '../types'
import { Save, ListPlus, Check, Loader2 } from 'lucide-react'

export default function SiteSettings() {
  const [, setSettings] = useState<AppSettings | null>(null)
  const [themes, setThemes] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [themeInput, setThemeInput] = useState('')
  const [levelInput, setLevelInput] = useState('')

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setThemes(s.themes)
      setLevels(s.relevance_levels)
    })
  }, [])

  function addTheme(e: React.FormEvent) {
    e.preventDefault()
    const value = themeInput.trim()
    if (!value || themes.includes(value)) return
    setThemes([...themes, value])
    setThemeInput('')
  }

  function removeTheme(value: string) {
    setThemes(themes.filter((t) => t !== value))
  }

  function addLevel(e: React.FormEvent) {
    e.preventDefault()
    const value = levelInput.trim()
    if (!value || levels.includes(value)) return
    setLevels([...levels, value])
    setLevelInput('')
  }

  function removeLevel(value: string) {
    setLevels(levels.filter((l) => l !== value))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMessage(null)
    if (themes.length === 0) { setMessage('Adicione pelo menos um tema.'); setBusy(false); return }
    if (levels.length === 0) { setMessage('Adicione pelo menos um nível de relevância.'); setBusy(false); return }
    const saved = await saveSettings({ themes, relevance_levels: levels })
    setSettings(saved)
    setMessage('Configurações guardadas.')
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações do Sítio</h1>
        <p className="text-sm text-slate-500">Defina os Temas e a escala de Relevância usados nas leituras. Estas listas aparecem nos formulários e nos filtros.</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${message.includes('Adicione') ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
          <Check className="h-4 w-4" /> {message}
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-700">Temas (grupos de leituras)</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Agrupas as leituras por tema. Usa o mesmo texto nas leituras para filtrar e ordenar por tema.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="mb-1 block text-xs font-medium text-slate-500">Novo tema</label>
              <input
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder="ex: Teoria / Conceitos"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button type="button" onClick={addTheme} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Adicionar tema</button>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {themes.map((t) => (
              <li key={t} className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
                {t}
                <button type="button" onClick={() => removeTheme(t)} className="text-amber-400 hover:text-amber-700"><X /></button>
              </li>
            ))}
            {themes.length === 0 && <p className="text-xs text-slate-400">Sem temas ainda.</p>}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">Níveis de Relevância</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Classifica cada leitura quanto à relevância para a investigação. Define a escala que quiseres.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="mb-1 block text-xs font-medium text-slate-500">Novo nível</label>
              <input
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                placeholder="ex: Essencial"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button type="button" onClick={addLevel} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Adicionar nível</button>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {levels.map((l) => (
              <li key={l} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
                {l}
                <button type="button" onClick={() => removeLevel(l)} className="text-emerald-400 hover:text-emerald-700"><X /></button>
              </li>
            ))}
            {levels.length === 0 && <p className="text-xs text-slate-400">Sem níveis ainda.</p>}
          </ul>
        </div>

        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configurações
        </button>
      </form>
    </div>
  )
}

function X() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}
