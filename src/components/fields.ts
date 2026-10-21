// ============================================================================
// Field definitions that drive both the edit forms and validation.
// This mirrors the spreadsheet columns exactly.
// ============================================================================
import type { CollectionName } from '../types'
import {
  LEITURA_ESTADOS,
  POR_LER_ESTADOS,
  COORIENTADOR_ESTADOS,
  TIPOS_DE_NOTA,
  A_CONFIRMAR_OPTIONS,
  ORIGEM_OPTIONS,
} from '../types'

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'date' | 'link'

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
}

export interface CollectionConfig {
  name: CollectionName
  title: string
  description: string
  fields: FieldConfig[]
  /** When true, the id_leitura column links to a reading title. */
  linksToReading?: boolean
}

export const LEITURA_CONFIG: CollectionConfig = {
  name: 'leituras',
  title: 'Leituras',
  description: 'Leituras já trabalhadas — referências, problemáticas e teses de partida.',
  linksToReading: false,
  fields: [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'autores', label: 'Autor(es)', type: 'text', required: true },
    { key: 'ano', label: 'Ano', type: 'number' },
    { key: 'titulo', label: 'Título / Texto', type: 'textarea', required: true },
    { key: 'referencia_apa', label: 'Referência APA 7', type: 'textarea' },
    { key: 'problematica', label: 'Problemática (provisória)', type: 'textarea' },
    { key: 'tese', label: 'Tese / Ideia central (provisória)', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: [...LEITURA_ESTADOS] },
    { key: 'fonte_link', label: 'Fonte / Link', type: 'link' },
    { key: 'conferencias', label: 'Conferências', type: 'textarea' },
  ],
}

export const NOTAS_NOVAS_CONFIG: CollectionConfig = {
  name: 'notas_novas',
  title: 'Notas Novas',
  description: 'Uma linha por síntese, reflexão, pergunta, conceito ou citação. Liga-a sempre ao ID da leitura.',
  linksToReading: true,
  fields: [
    { key: 'id_leitura', label: 'ID Leitura', type: 'text', required: true },
    { key: 'pagina_seccao', label: 'Página / Secção', type: 'text' },
    { key: 'tipo_nota', label: 'Tipo de nota', type: 'select', options: [...TIPOS_DE_NOTA] },
    { key: 'texto_idea', label: 'Texto / Ideia escrita por mim', type: 'textarea', required: true },
    { key: 'tema', label: 'Tema', type: 'text' },
    { key: 'racoes_com_outros', label: 'Relações com outros textos', type: 'textarea' },
    { key: 'data', label: 'Data', type: 'date' },
    { key: 'a_confeir', label: 'A conferir?', type: 'select', options: [...A_CONFIRMAR_OPTIONS] },
  ],
}

export const AUTORES_CITADO_CONFIG: CollectionConfig = {
  name: 'autores_citados',
  title: 'Autores Citados',
  description: 'Uma linha para cada par texto–autor citado. Conta as menções no texto original.',
  linksToReading: true,
  fields: [
    { key: 'id_leitura', label: 'ID Leitura', type: 'text', required: true },
    { key: 'autor_citado', label: 'Autor citado', type: 'text', required: true },
    { key: 'num_mencoes', label: 'N.º menções', type: 'number' },
    { key: 'paginas_locais', label: 'Páginas / Locais', type: 'text' },
    { key: 'como_e_mobilizado', label: 'Como é mobilizado?', type: 'textarea' },
    { key: 'contagem_confeida', label: 'Contagem conferida?', type: 'select', options: [...A_CONFIRMAR_OPTIONS] },
  ],
}

export const POR_LER_CONFIG: CollectionConfig = {
  name: 'por_ler',
  title: 'Por Ler',
  description: 'Artigos do recorte e leituras ainda não trabalhadas.',
  linksToReading: false,
  fields: [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'autores_ficheiro', label: 'Autor(es) / Ficheiro', type: 'text', required: true },
    { key: 'ano', label: 'Ano*', type: 'number' },
    { key: 'titulo_ficheiro', label: 'Título / Nome do ficheiro', type: 'textarea', required: true },
    { key: 'origem', label: 'Origem', type: 'select', options: [...ORIGEM_OPTIONS] },
    { key: 'estado', label: 'Estado', type: 'select', options: [...POR_LER_ESTADOS] },
    { key: 'referencia_apa', label: 'Referência APA 7', type: 'textarea' },
    { key: 'ligacao_doutoramento', label: 'Possível ligação ao doutoramento', type: 'textarea' },
    { key: 'a_confirmar', label: 'A confirmar', type: 'textarea' },
  ],
}

export const COORIENTADOR_CONFIG: CollectionConfig = {
  name: 'coorientadores',
  title: 'Coorientadores',
  description: 'Lista de pessoas/pastas a investigar, não leituras realizadas nem contactos confirmados.',
  linksToReading: false,
  fields: [
    { key: 'nome_pasta', label: 'Nome da pasta', type: 'text', required: true },
    { key: 'instituicao', label: 'Instituição (a confirmar)', type: 'text' },
    { key: 'area_interesse', label: 'Área / Interesse', type: 'text' },
    { key: 'textos_explorar', label: 'Textos para explorar', type: 'textarea' },
    { key: 'estado', label: 'Estado', type: 'select', options: [...COORIENTADOR_ESTADOS] },
    { key: 'notas_contacto', label: 'Notas / Contacto', type: 'textarea' },
  ],
}

export const COLLECTION_CONFIGS: Record<Exclude<CollectionName, 'legendas' | 'tarefas'>, CollectionConfig> = {
  leituras: LEITURA_CONFIG,
  notas_novas: NOTAS_NOVAS_CONFIG,
  autores_citados: AUTORES_CITADO_CONFIG,
  por_ler: POR_LER_CONFIG,
  coorientadores: COORIENTADOR_CONFIG,
}

export function getConfig(name: CollectionName): CollectionConfig | undefined {
  if (name === 'legendas' || name === 'tarefas') return undefined
  return COLLECTION_CONFIGS[name]
}
