type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitOptions = {
  windowMs: number
  max: number
  key: string
}

export function hitRateLimit(opts: RateLimitOptions): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(opts.key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (existing.count >= opts.max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

export function clientKey(event: { node: { req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } } } }): string {
  const forwarded = (event.node.req.headers['x-forwarded-for'] as string) ?? ''
  const first = forwarded.split(',')[0]?.trim()
  return first || event.node.req.socket?.remoteAddress || 'unknown'
}
