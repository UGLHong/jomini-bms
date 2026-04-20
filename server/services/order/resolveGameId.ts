export type ResolvedGameId = {
  canonical: string
  ign: string
  parts: string[]
}

export function resolveGameId(raw: string, gameIdFormat: Record<string, unknown> = {}): ResolvedGameId {
  const trimmed = String(raw ?? '').trim()
  const splitPattern = typeof gameIdFormat.splitPattern === 'string' ? gameIdFormat.splitPattern : '\\s+'

  let parts: string[] = [trimmed]
  try {
    parts = trimmed.split(new RegExp(splitPattern)).map((s) => s.trim()).filter(Boolean)
  } catch {
    parts = trimmed.split(/\s+/).map((s) => s.trim()).filter(Boolean)
  }

  const canonical = parts.join(' ')
  return {
    canonical,
    ign: '',
    parts,
  }
}
