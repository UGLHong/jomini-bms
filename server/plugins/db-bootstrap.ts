import { runBootstrap } from '@/server/db/bootstrap'
import { getPool } from '@/server/db/client'
import { tryWithNamedLock } from '@/server/services/order/locks'
import { logger } from '@/server/utils/logger'

export default defineNitroPlugin(() => {
  if (process.env.DB_BOOTSTRAP_ON_START === '0') {
    logger.info('[bootstrap] skipped (DB_BOOTSTRAP_ON_START=0)')
    return
  }

  const boot = async () => {
    try {
      const pool = getPool()
      const result = await tryWithNamedLock('db:bootstrap', () =>
        runBootstrap(pool, (msg, extra) =>
          extra === undefined ? logger.info(msg) : logger.info({ extra }, msg),
        ),
      )
      if (result === null) {
        logger.info('[bootstrap] another instance already holds the lock, skipping')
        return
      }
      logger.info({ result }, '[bootstrap] completed')
    } catch (err) {
      logger.error({ err }, '[bootstrap] failed')
    }
  }

  void boot()
})
