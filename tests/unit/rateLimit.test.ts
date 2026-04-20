import { describe, expect, it } from 'vitest'
import { hitRateLimit } from '@/server/utils/rateLimit'

describe('rate limit', () => {
  it('allows up to max within window', () => {
    const key = `rl-test-${Math.random()}`
    for (let i = 0; i < 3; i += 1) {
      expect(hitRateLimit({ key, windowMs: 1000, max: 3 }).allowed).toBe(true)
    }
    const next = hitRateLimit({ key, windowMs: 1000, max: 3 })
    expect(next.allowed).toBe(false)
    expect(next.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after window elapses', async () => {
    const key = `rl-test-${Math.random()}`
    expect(hitRateLimit({ key, windowMs: 20, max: 1 }).allowed).toBe(true)
    expect(hitRateLimit({ key, windowMs: 20, max: 1 }).allowed).toBe(false)
    await new Promise((r) => setTimeout(r, 30))
    expect(hitRateLimit({ key, windowMs: 20, max: 1 }).allowed).toBe(true)
  })
})
