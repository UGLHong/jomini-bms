import { useDb } from '@/server/db/client'
import { supplierTable } from '@/server/db/schema'
import { supplierDailyCounts } from '@/server/services/reports/dailySummary'
import { sendTelegramMessage } from '@/server/services/notify/telegram'
import { formatMytDateTime } from '@/server/utils/externalEnvelope'

export default defineTask({
  meta: {
    name: 'reports:daily-supplier-summary',
    description: 'Notify each supplier group with their daily completed order count',
  },
  async run() {
    const db = useDb()
    const suppliers = await db.select().from(supplierTable)

    const today = new Date()
    let sent = 0
    for (const supplier of suppliers) {
      if (!supplier.telegramGroupId) continue
      const count = await supplierDailyCounts(today, supplier.key)
      await sendTelegramMessage({
        chatId: supplier.telegramGroupId,
        text: `<b>Daily count</b> ${formatMytDateTime(today)}\nSupplier: ${supplier.name}\nCompleted orders: <b>${count}</b>`,
      })
      sent += 1
    }
    return { result: `notified ${sent} suppliers` }
  },
})
