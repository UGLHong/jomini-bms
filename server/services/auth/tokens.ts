import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { serverConfig } from '@/server/utils/config'
import type { UserRole } from '@/server/db/schema'

export type AccessTokenPayload = {
  sub: string
  role: UserRole
  name: string
  sid: string
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const cfg = serverConfig()
  const secret = mustSecret(cfg.jwtAccessSecret, 'JWT_ACCESS_SECRET')
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + cfg.jwtAccessTtl)
    .setIssuer('jomini-bms')
    .sign(secret)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const cfg = serverConfig()
  const secret = mustSecret(cfg.jwtAccessSecret, 'JWT_ACCESS_SECRET')
  const { payload } = await jwtVerify(token, secret, { issuer: 'jomini-bms' })
  return payload as unknown as AccessTokenPayload
}

export function generateRefreshToken(): { plain: string; hash: string } {
  const plain = randomBytes(48).toString('base64url')
  const hash = hashRefreshToken(plain)
  return { plain, hash }
}

export function hashRefreshToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

export function generateInviteToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(plain).digest('hex')
  return { plain, hash }
}

export function hashInviteToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

function mustSecret(value: string, name: string): Uint8Array {
  if (!value || value.length < 16) {
    throw new Error(`${name} must be set (minimum 16 chars)`)
  }
  return new TextEncoder().encode(value)
}
