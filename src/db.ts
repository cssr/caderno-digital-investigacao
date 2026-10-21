import Dexie, { Table } from 'dexie'
import type {
  Leitura,
  NotaNova,
  AutorCitado,
  PorLer,
  Coorientador,
  Legenda,
  Tarefa,
  CollectionName,
} from './types'

interface CadernoDB {
  leituras: Table<Leitura, string>
  notas_novas: Table<NotaNova, string>
  autores_citados: Table<AutorCitado, string>
  por_ler: Table<PorLer, string>
  coorientadores: Table<Coorientador, string>
  legendas: Table<Legenda, string>
  tarefas: Table<Tarefa, string>
}

const raw = new Dexie('CadernoInvestigacaoDB')

raw.version(1).stores({
  leituras: 'id',
  notas_novas: 'id, id_leitura',
  autores_citados: 'id, id_leitura',
  por_ler: 'id',
  coorientadores: 'id',
  legendas: 'id',
  tarefas: 'id, category',
})

export const db = raw as unknown as CadernoDB

export type DB = CadernoDB

// Map a collection name to its Dexie table
export function tableFor(name: CollectionName): Table<any, string> {
  return db[name] as Table<any, string>
}

export const COLLECTIONS: CollectionName[] = [
  'leituras',
  'notas_novas',
  'autores_citados',
  'por_ler',
  'coorientadores',
  'legendas',
  'tarefas',
]

// Track whether the initial seed has run in this browser
export const SEED_FLAG = 'caderno-seeded-v1'
