import type { H3Event } from 'h3'
import { deleteCookie, setCookie } from 'h3'
import { isProduction, serverConfig } from '@/server/utils/config'

export const ACCESS_COOKIE = 'jbms_access'
export const REFRESH_COOKIE = 'jbms_refresh'

type CookieOptions = {
  maxAge?: number
  expires?: Date
}

export function setAuthCookies(
  event: H3Event,
  accessToken: string,
  refreshToken: string,
): void {
  const cfg = serverConfig()
  setCookie(event, ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: cfg.jwtAccessTtl,
    domain: cfg.cookieDomain || undefined,
  })

  setCookie(event, REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: cfg.jwtRefreshTtl,
    domain: cfg.cookieDomain || undefined,
  })
}

export function setAccessCookie(event: H3Event, accessToken: string, opts: CookieOptions = {}): void {
  const cfg = serverConfig()
  setCookie(event, ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: opts.maxAge ?? cfg.jwtAccessTtl,
    domain: cfg.cookieDomain || undefined,
  })
}

export function clearAuthCookies(event: H3Event): void {
  const cfg = serverConfig()
  const domain = cfg.cookieDomain || undefined
  deleteCookie(event, ACCESS_COOKIE, { path: '/', domain })
  deleteCookie(event, REFRESH_COOKIE, { path: '/', domain })
}
