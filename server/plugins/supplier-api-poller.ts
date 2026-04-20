import { useRuntimeConfig } from '#imports'
import { pollPendingSubmissions } from '@/server/services/supplier-api/dispatch'
import { tryWithNamedLock } from '@/server/services/order/locks'
import { logger } from '@/server/utils/logger'

const MIN_INTERVAL_MS = 5_000
const DEFAULT_INTERVAL_MS = 30_000

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  const configured = Number(config.supplierApiPollIntervalMs ?? DEFAULT_INTERVAL_MS)
  if (!Number.isFinite(configured) || configured <= 0) {
    logger.info('[supplier-api] poller disabled via SUPPLIER_API_POLL_INTERVAL_MS=0')
    return
  }
  const intervalMs = Math.max(MIN_INTERVAL_MS, configured)

  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await tryWithNamedLock('supplier-api:poll', () => pollPendingSubmissions())
      if (result && result.transitions > 0) {
        logger.debug({ result }, '[supplier-api] poll tick')
      }
    } catch (err) {
      logger.warn({ err }, '[supplier-api] poll tick failed')
    } finally {
      running = false
    }
  }

  const timer = setInterval(tick, intervalMs)
  timer.unref?.()

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
  })

  logger.info({ intervalMs }, '[supplier-api] poller started')
})
