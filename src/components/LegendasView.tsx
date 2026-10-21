import { useEffect, useState } from 'react'
import { db } from '../db'
import type { Legenda } from '../types'
import { FileText } from 'lucide-react'

const HEADERS: { key: keyof Legenda; label: string }[] = [
  { key: 'marcacao_word', label: 'Marcação no Word' },
  { key: 'para_que_serve', label: 'Para que serve' },
  { key: 'como_registar', label: 'Como registar' },
  { key: 'nota', label: 'Nota' },
]

export default function LegendasView() {
  const [items, setItems] = useState<Legenda[]>([])

  useEffect(() => {
    db.legendas.toArray().then((rows) => setItems(rows))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Legendas de Marcação</h1>
        <p className="text-sm text-slate-500">Convenções de marcação no Word e como transladá-las para as notas do caderno.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {HEADERS.map((h) => <th key={h.key} className="px-3 py-2 font-semibold whitespace-nowrap">{h.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr><td colSpan={HEADERS.length} className="px-3 py-8 text-center text-slate-400">Sem legendas registadas.</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                {HEADERS.map((h) => (
                  <td key={h.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">{String((it as any)[h.key] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
        <FileText className="mt-0.5 h-4 w-4" />
        <p className="text-xs"> Estas legendas são de apoio à recolha. Não são editáveis por aqui — são informação de referência extraída da planilha.</p>
      </div>
    </div>
  )
}
