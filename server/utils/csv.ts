function escape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = value instanceof Date ? value.toISOString() : String(value)
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[], headers?: string[]): string {
  if (!rows.length && !headers) return ''
  const keys = headers ?? Object.keys(rows[0] ?? {})
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(','))
  }
  return lines.join('\n') + '\n'
}
