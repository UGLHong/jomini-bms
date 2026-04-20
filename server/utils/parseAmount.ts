export function parseAmount(raw: string | number | null | undefined): number {
  if (raw == null) return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw

  const str = String(raw)
  const match = str.match(/[.\d]+/)
  if (!match) return 0

  const n = Number.parseFloat(match[0])
  return Number.isFinite(n) ? n : 0
}
