// ============================================================================
// Data model extracted from Caderno_de_investigacao_recomecar.xlsx
// Each collection mirrors one sheet of the spreadsheet.
// ============================================================================

export interface Timestamps {
  created_at: string
  updated_at: string
}

// ---- LEITURAS (Readings / already-worked readings) ----
export interface Leitura extends Timestamps {
  id: string
  autores: string
  ano: number | null
  titulo: string
  referencia_apa: string
  problematica: string
  tese: string
  estado: string
  fonte_link: string
  conferencias: string
}

// ---- NOTAS NOVAS (New notes, linked to a reading) ----
export interface NotaNova extends Timestamps {
  id: string
  id_leitura: string
  pagina_seccao: string
  tipo_nota: string
  texto_idea: string
  tema: string
  racoes_com_outros: string
  data: string
  a_confeir: string
}

// ---- AUTORES CITADOS (Cited authors within a reading) ----
export interface AutorCitado extends Timestamps {
  id: string
  id_leitura: string
  autor_citado: string
  num_mencoes: number
  paginas_locais: string
  como_e_mobilizado: string
  contagem_confeida: string
}

// ---- POR LER (Reading list to explore) ----
export interface PorLer extends Timestamps {
  id: string
  autores_ficheiro: string
  ano: number | null
  titulo_ficheiro: string
  origem: string
  estado: string
  referencia_apa: string
  ligacao_doutoramento: string
  a_confirmar: string
}

// ---- COORIENTADORES (Possible co-supervisors) ----
export interface Coorientador extends Timestamps {
  id: string
  nome_pasta: string
  instituicao: string
  area_interesse: string
  textos_explorar: string
  estado: string
  notas_contacto: string
}

// ---- LEGENDA (Reference / marking conventions) ----
export interface Legenda {
  id: string
  marcacao_word: string
  para_que_serve: string
  como_registar: string
  nota: string
}

// ---- TAREFAS (Task tracker — To-do / On-going / Complete) ----
export type TaskCategory = 'todo' | 'ongoing' | 'complete'
export type TaskPriority = 'baixa' | 'media' | 'alta'

export interface Tarefa {
  id: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  due_date: string
  related_id: string
  created_at: string
  updated_at: string
}

// ---- LEGENDS / ENUMS ----
export const LEITURA_ESTADOS = ['Em leitura', 'A reler', 'Lido', 'Arquivado'] as const
export const POR_LER_ESTADOS = ['Por ler', 'Em leitura', 'Lido', 'Arquivado'] as const
export const COORIENTADOR_ESTADOS = ['Por explorar', 'Em progresso', 'Concluído'] as const

export const TIPOS_DE_NOTA = [
  'Conceito a explorar',
  'Síntese minha',
  'Citação literal',
  'Reflexão minha',
  'Pergunta minha',
  'Relações com outros textos',
  'Contextualização',
] as const

export const A_CONFIRMAR_OPTIONS = ['Sim', 'Não', 'Por confirmar'] as const

export const ORIGEM_OPTIONS = [
  'Recorte — artigos guardados',
  'Conversas anteriores',
  'Sugestão de coorientador',
  'Outro',
] as const

// Human-readable labels for task categories
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  todo: 'To-do',
  ongoing: 'On-going',
  complete: 'Complete',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export type CollectionName = 'leituras' | 'notas_novas' | 'autores_citados' | 'por_ler' | 'coorientadores' | 'legendas' | 'tarefas'

export type AnyRecord = Leitura | NotaNova | AutorCitado | PorLer | Coorientador | Tarefa


// ---- COLUMN DEFINITIONS (used for table rendering + CSV export) ----
export interface ColumnDef {
  key: string
  label: string
  type?: 'text' | 'number' | 'date'
}

export const LEITURA_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'autores', label: 'Autor(es)', type: 'text' },
  { key: 'ano', label: 'Ano', type: 'number' },
  { key: 'titulo', label: 'Título / Texto', type: 'text' },
  { key: 'referencia_apa', label: 'Referência APA 7', type: 'text' },
  { key: 'problematica', label: 'Problemática', type: 'text' },
  { key: 'tese', label: 'Tese / Ideia central', type: 'text' },
  { key: 'estado', label: 'Estado', type: 'text' },
  { key: 'fonte_link', label: 'Fonte / Link', type: 'text' },
  { key: 'conferencias', label: 'Conferências', type: 'text' },
]

export const NOTAS_NOVAS_COLUMNS: ColumnDef[] = [
  { key: 'id_leitura', label: 'ID Leitura', type: 'text' },
  { key: 'pagina_seccao', label: 'Página / Secção', type: 'text' },
  { key: 'tipo_nota', label: 'Tipo de nota', type: 'text' },
  { key: 'texto_idea', label: 'Texto / Ideia', type: 'text' },
  { key: 'tema', label: 'Tema', type: 'text' },
  { key: 'racoes_com_outros', label: 'Relações com outros textos', type: 'text' },
  { key: 'data', label: 'Data', type: 'date' },
  { key: 'a_confeir', label: 'A conferir?', type: 'text' },
]

export const AUTORES_CITADOS_COLUMNS: ColumnDef[] = [
  { key: 'id_leitura', label: 'ID Leitura', type: 'text' },
  { key: 'autor_citado', label: 'Autor citado', type: 'text' },
  { key: 'num_mencoes', label: 'N.º menções', type: 'number' },
  { key: 'paginas_locais', label: 'Páginas / Locais', type: 'text' },
  { key: 'como_e_mobilizado', label: 'Como é mobilizado?', type: 'text' },
  { key: 'contagem_confeida', label: 'Contagem conferida?', type: 'text' },
]

export const POR_LER_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', type: 'text' },
  { key: 'autores_ficheiro', label: 'Autor(es) / Ficheiro', type: 'text' },
  { key: 'ano', label: 'Ano*', type: 'number' },
  { key: 'titulo_ficheiro', label: 'Título / Nome do ficheiro', type: 'text' },
  { key: 'origem', label: 'Origem', type: 'text' },
  { key: 'estado', label: 'Estado', type: 'text' },
  { key: 'referencia_apa', label: 'Referência APA 7', type: 'text' },
  { key: 'ligacao_doutoramento', label: 'Ligação ao doutoramento', type: 'text' },
  { key: 'a_confirmar', label: 'A confirmar', type: 'text' },
]

export const COORIENTADOR_COLUMNS: ColumnDef[] = [
  { key: 'nome_pasta', label: 'Nome da pasta', type: 'text' },
  { key: 'instituicao', label: 'Instituição', type: 'text' },
  { key: 'area_interesse', label: 'Área / Interesse', type: 'text' },
  { key: 'textos_explorar', label: 'Textos para explorar', type: 'text' },
  { key: 'estado', label: 'Estado', type: 'text' },
  { key: 'notas_contacto', label: 'Notas / Contacto', type: 'text' },
]

export const TAREFA_COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'category', label: 'Categoria', type: 'text' },
  { key: 'priority', label: 'Prioridade', type: 'text' },
  { key: 'due_date', label: 'Prazo', type: 'date' },
  { key: 'related_id', label: 'Ligação', type: 'text' },
  { key: 'description', label: 'Descrição', type: 'text' },
]
