import { useRuntimeConfig } from '#imports'
import { computeDailySummary } from '@/server/services/reports/dailySummary'
import { sendTelegramMessage } from '@/server/services/notify/telegram'
import { formatMytDateTime } from '@/server/utils/externalEnvelope'

export default defineTask({
  meta: {
    name: 'reports:daily-internal-summary',
    description: 'Send an internal daily summary to the Telegram group',
  },
  async run() {
    const config = useRuntimeConfig()
    const chatId = String(config.telegramInternalGroupId ?? '')
    if (!chatId) return { result: 'no_group' }

    const today = new Date()
    const rows = await computeDailySummary(today)
    if (!rows.length) return { result: 'no_rows' }

    const header = `<b>Daily summary</b>\n${formatMytDateTime(today)}`
    const body = rows
      .map(
        (r) =>
          `• ${r.gameKey}/${r.supplierKey}: ${r.doneOrders}/${r.totalOrders} done, profit RM ${r.totalProfit.toFixed(2)}`,
      )
      .join('\n')

    await sendTelegramMessage({
      chatId,
      text: `${header}\n${body}`,
    })

    return { result: `sent ${rows.length} lines` }
  },
})
