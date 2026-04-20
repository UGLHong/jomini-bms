import { useRuntimeConfig } from '#imports'
import { and, eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import { orderTable } from '@/server/db/schema'
import { markDone, markError } from '@/server/services/order/process'
import { tryAcquireRelayLock } from '@/server/services/order/locks'
import { sendTelegramMessage } from '@/server/services/notify/telegram'
import { logger } from '@/server/utils/logger'
import { badRequest } from '@/server/utils/errors'

type TelegramMessage = {
  message_id?: number
  chat?: { id: number | string; title?: string }
  from?: { id?: number; username?: string; first_name?: string }
  text?: string
  reply_to_message?: TelegramMessage
}

type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const headerToken = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (!config.telegramWebhookToken || headerToken !== config.telegramWebhookToken) {
    throw badRequest('Invalid webhook token')
  }

  const update = (await readBody(event)) as TelegramUpdate | null
  const message = update?.message
  if (!message?.text || !message.reply_to_message?.message_id) return { ok: true }

  const text = message.text.trim().toLowerCase()
  const isDone = text.startsWith('/d') || text === 'd'
  const isFail = text.startsWith('/f') || text === 'f'
  if (!isDone && !isFail) return { ok: true }

  const replyMsgId = String(message.reply_to_message.message_id)
  const db = useDb()

  const [order] = await db
    .select()
    .from(orderTable)
    .where(and(eq(orderTable.telegramOrderMsgId, replyMsgId)))
    .limit(1)

  if (!order) return { ok: true }

  const locked = await tryAcquireRelayLock(`${replyMsgId}:${isDone ? 'd' : 'f'}`)
  if (!locked) return { ok: true }

  const actor = {
    id: message.from?.id ? String(message.from.id) : 'telegram',
    name: message.from?.username || message.from?.first_name || 'telegram',
  }

  try {
    if (isDone) {
      await markDone({
        orderId: order.id,
        actor,
        successful: order.processPending.length ? order.processPending : [{ amount: Number(order.buyAmount || 0) }],
      })
      await sendTelegramMessage({
        chatId: String(message.chat?.id ?? ''),
        text: `#${order.id} marked DONE by ${actor.name}`,
        replyToMessageId: message.message_id,
      })
    } else {
      await markError({
        orderId: order.id,
        actor,
        failed: [{ amount: Number(order.buyAmount || 0), reason: message.text || 'supplier_failed' }],
      })
      await sendTelegramMessage({
        chatId: String(message.chat?.id ?? ''),
        text: `#${order.id} marked FAILED by ${actor.name}`,
        replyToMessageId: message.message_id,
      })
    }
  } catch (err) {
    logger.warn({ err, orderId: order.id }, '[telegram webhook] action failed')
  }

  return { ok: true }
})
