import { createError, type H3Error } from 'h3'

export function badRequest(message: string, data?: unknown): H3Error {
  return createError({ statusCode: 400, statusMessage: 'Bad Request', message, data })
}

export function unauthorized(message = 'Unauthorized'): H3Error {
  return createError({ statusCode: 401, statusMessage: 'Unauthorized', message })
}

export function forbidden(message = 'Forbidden'): H3Error {
  return createError({ statusCode: 403, statusMessage: 'Forbidden', message })
}

export function notFound(message = 'Not Found'): H3Error {
  return createError({ statusCode: 404, statusMessage: 'Not Found', message })
}

export function conflict(message: string): H3Error {
  return createError({ statusCode: 409, statusMessage: 'Conflict', message })
}

export function internal(message = 'Internal Server Error', cause?: unknown): H3Error {
  return createError({ statusCode: 500, statusMessage: 'Internal Server Error', message, cause })
}
