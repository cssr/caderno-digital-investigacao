// Small, dependency-free helpers used across the app.

/** Generate a short unique id. */
export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36).slice(-4)
  return `${prefix}_${rand}${time}`
}

/** Format an ISO date string for display. Returns '' when empty/invalid. */
export function formatDate(value: string | number | null | undefined): string {
  if (!value) return ''
  let d: Date
  if (typeof value === 'number') d = new Date(value)
  else d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Normalize a possibly-empty numeric cell into number|null. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

/** Format a number for display (year etc.). */
export function num(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

/** Escape a CSV field per RFC 4180. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Join fields into a CSV line. */
export function toCsvLine(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

/** Split a CSV line into fields (handles quoted fields). */
export function fromCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
    i++
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

/** Download a blob as a file. */
export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Lowercase helper for fuzzy search. */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
