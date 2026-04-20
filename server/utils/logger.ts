import { pino } from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'jomini-bms' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'body.password',
    ],
    censor: '[REDACTED]',
  },
})

export { logger }
