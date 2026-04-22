import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { serverConfig } from '@/server/utils/config'
import { unauthorized } from '@/server/utils/errors'

export function requireCustomAuth(event: H3Event): void {
  const cfg = serverConfig()
  const expected = cfg.customAuthToken
  if (!expected) throw unauthorized('CustomAuth not configured')

  const provided = getHeader(event, 'customauth') ?? getHeader(event, 'CustomAuth') ?? ''
  if (!provided) throw unauthorized('CustomAuth missing')

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a as Buffer, b as Buffer)) {
    throw unauthorized('CustomAuth invalid')
  }
}
