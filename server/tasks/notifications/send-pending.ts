import { processPendingNotifications } from '@/server/services/notify/dispatch'
import { logger } from '@/server/utils/logger'

export default defineTask({
  meta: {
    name: 'notifications:send-pending',
    description: 'Process due pending notifications (write_review, daily summaries)',
  },
  async run() {
    const processed = await processPendingNotifications()
    logger.info({ processed }, '[task] send-pending finished')
    return { result: `processed ${processed}` }
  },
})
