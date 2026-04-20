import { eq, and, gt, isNull } from 'drizzle-orm'
import { getCookie, getHeader, getRequestIP, type H3Event } from 'h3'
import { useDb } from '@/server/db/client'
import { refreshTokenTable, userTable, type UserRole } from '@/server/db/schema'
import { serverConfig } from '@/server/utils/config'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './cookies'
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens'

export type AuthedUser = {
  id: string
  email: string
  role: UserRole
  displayName: string
}

export async function createSession(
  event: H3Event,
  user: AuthedUser,
): Promise<{ accessToken: string; refreshPlain: string }> {
  const db = useDb()
  const cfg = serverConfig()
  const { plain, hash } = generateRefreshToken()
  const ua = getHeader(event, 'user-agent') ?? ''
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''

  const [row] = await db
    .insert(refreshTokenTable)
    .values({
      userId: user.id,
      tokenHash: hash,
      userAgent: ua.slice(0, 512),
      ipAddress: ip.slice(0, 64),
      expiresAt: new Date(Date.now() + cfg.jwtRefreshTtl * 1000),
    })
    .returning({ id: refreshTokenTable.id })

  if (!row) throw new Error('failed to persist refresh token')

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    name: user.displayName,
    sid: row.id,
  })

  setAuthCookies(event, accessToken, plain)
  return { accessToken, refreshPlain: plain }
}

export async function readAccessTokenFromEvent(event: H3Event): Promise<AuthedUser | null> {
  const token = getCookie(event, ACCESS_COOKIE)
  if (!token) return null

  try {
    const payload = await verifyAccessToken(token)
    return {
      id: payload.sub,
      email: '',
      role: payload.role,
      displayName: payload.name ?? '',
    }
  } catch {
    return null
  }
}

export async function rotateRefreshToken(event: H3Event): Promise<{ accessToken: string; user: AuthedUser } | null> {
  const db = useDb()
  const cfg = serverConfig()
  const refreshPlain = getCookie(event, REFRESH_COOKIE)
  if (!refreshPlain) return null

  const hash = hashRefreshToken(refreshPlain)
  const [row] = await db
    .select({
      id: refreshTokenTable.id,
      userId: refreshTokenTable.userId,
      revoked: refreshTokenTable.revoked,
      expiresAt: refreshTokenTable.expiresAt,
    })
    .from(refreshTokenTable)
    .where(
      and(
        eq(refreshTokenTable.tokenHash, hash),
        eq(refreshTokenTable.revoked, false),
        gt(refreshTokenTable.expiresAt, new Date()),
        isNull(refreshTokenTable.revokedAt),
      ),
    )
    .limit(1)

  if (!row) {
    clearAuthCookies(event)
    return null
  }

  const [userRow] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      role: userTable.role,
      status: userTable.status,
      displayName: userTable.displayName,
    })
    .from(userTable)
    .where(eq(userTable.id, row.userId))
    .limit(1)

  if (!userRow || userRow.status !== 'active') {
    await db
      .update(refreshTokenTable)
      .set({ revoked: true, revokedAt: new Date() })
      .where(eq(refreshTokenTable.id, row.id))
    clearAuthCookies(event)
    return null
  }

  const { plain: newPlain, hash: newHash } = generateRefreshToken()
  const ua = getHeader(event, 'user-agent') ?? ''
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? ''

  const [newRow] = await db
    .insert(refreshTokenTable)
    .values({
      userId: userRow.id,
      tokenHash: newHash,
      userAgent: ua.slice(0, 512),
      ipAddress: ip.slice(0, 64),
      expiresAt: new Date(Date.now() + cfg.jwtRefreshTtl * 1000),
    })
    .returning({ id: refreshTokenTable.id })

  if (!newRow) throw new Error('failed to rotate refresh token')

  await db
    .update(refreshTokenTable)
    .set({
      revoked: true,
      revokedAt: new Date(),
      replacedByTokenHash: newHash,
    })
    .where(eq(refreshTokenTable.id, row.id))

  const user: AuthedUser = {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    displayName: userRow.displayName,
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    name: user.displayName,
    sid: newRow.id,
  })

  setAuthCookies(event, accessToken, newPlain)
  return { accessToken, user }
}

export async function revokeSession(event: H3Event): Promise<void> {
  const db = useDb()
  const refreshPlain = getCookie(event, REFRESH_COOKIE)
  if (refreshPlain) {
    const hash = hashRefreshToken(refreshPlain)
    await db
      .update(refreshTokenTable)
      .set({ revoked: true, revokedAt: new Date() })
      .where(eq(refreshTokenTable.tokenHash, hash))
  }
  clearAuthCookies(event)
}

export async function loadUser(userId: string): Promise<AuthedUser | null> {
  const db = useDb()
  const [row] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      role: userTable.role,
      status: userTable.status,
      displayName: userTable.displayName,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!row || row.status !== 'active') return null
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
  }
}
