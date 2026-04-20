export function formatMoney(value: string | number | null | undefined, currency = 'RM'): string {
  if (value === null || value === undefined || value === '') return `${currency} 0.00`
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(n)) return `${currency} 0.00`
  return `${currency} ${n.toFixed(2)}`
}

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('en-MY').format(n)
}
