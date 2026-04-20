import { useRuntimeConfig } from '#imports'
import { eq } from 'drizzle-orm'
import { useDb } from '@/server/db/client'
import {
  type OrderRow,
  type PendingNotificationKind,
  orderTable,
  pendingNotificationTable,
  supplierTable,
} from '@/server/db/schema'
import { logger } from '@/server/utils/logger'
import { callFlowxo, languageFromOrder } from './flowxo'
import { sendTelegramMessage, sendTelegramPhoto } from './telegram'
import {
  renderInternalOrderMessage,
  renderOrderDoneMessage,
  renderSupplierRelayMessage,
} from './orderMessages'

export async function notifyOrderCreated(order: OrderRow): Promise<void> {
  const config = useRuntimeConfig()
  const db = useDb()

  const internalGroupId = String(config.telegramInternalGroupId ?? '')
  const text = renderInternalOrderMessage(order)
  const internalRes = await sendTelegramMessage({
    chatId: internalGroupId,
    text,
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'Open', url: `${String(config.telegramButtonUrl ?? '')}/orders/${order.id}` }],
      ],
    },
  })
  if (order.receiptUrl) {
    await sendTelegramPhoto({
      chatId: internalGroupId,
      photoUrl: order.receiptUrl,
      caption: `Receipt #${order.id}`,
      replyToMessageId: internalRes?.messageId,
    })
  }

  if (internalRes?.messageId) {
    await db
      .update(orderTable)
      .set({ telegramOrderMsgId: String(internalRes.messageId) })
      .where(eq(orderTable.id, order.id))
  }

  const [supplier] = await db.select().from(supplierTable).where(eq(supplierTable.key, order.supplierKey)).limit(1)
  const relayChatId = supplier?.telegramGroupId
  if (relayChatId) {
    await sendTelegramMessage({
      chatId: relayChatId,
      text: renderSupplierRelayMessage(order),
      replyMarkup: {
        inline_keyboard: [[{ text: 'Mark done (/d)', callback_data: `done:${order.id}` }]],
      },
    })
  }

  await callFlowxo({
    scenario: 'ORDER_RECEIVED',
    orderId: order.id,
    responsePath: order.responsePath || undefined,
    language: languageFromOrder(order),
    fullname: order.fullname,
    gameKey: order.gameKey,
    gameId: order.gameId,
    buyAmount: order.buyAmount,
    paidAmount: order.paidAmount,
  })
}

export async function notifyOrderDone(order: OrderRow): Promise<void> {
  const config = useRuntimeConfig()
  await sendTelegramMessage({
    chatId: String(config.telegramInternalGroupId ?? ''),
    text: renderOrderDoneMessage(order),
    replyToMessageId: order.telegramOrderMsgId ? Number(order.telegramOrderMsgId) : undefined,
  })

  await callFlowxo({
    scenario: 'ORDER_DONE',
    orderId: order.id,
    responsePath: order.responsePath || undefined,
    language: languageFromOrder(order),
    fullname: order.fullname,
    gameKey: order.gameKey,
    gameId: order.gameId,
  })

  await scheduleNotification({
    kind: 'write_review',
    orderId: order.id,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    payload: { responsePath: order.responsePath },
  })
}

export async function notifyOrderRejected(order: OrderRow): Promise<void> {
  await callFlowxo({
    scenario: 'ORDER_REJECTED',
    orderId: order.id,
    responsePath: order.responsePath || undefined,
    language: languageFromOrder(order),
    message: order.remark,
  })
}

export async function scheduleNotification(opts: {
  kind: PendingNotificationKind
  orderId?: string
  scheduledAt: Date
  payload?: Record<string, unknown>
}): Promise<void> {
  const db = useDb()
  await db.insert(pendingNotificationTable).values({
    kind: opts.kind,
    orderId: opts.orderId,
    scheduledAt: opts.scheduledAt,
    payload: opts.payload ?? {},
  })
}

export async function processPendingNotifications(now = new Date()): Promise<number> {
  const db = useDb()
  const due = await db
    .select()
    .from(pendingNotificationTable)
    .where(eq(pendingNotificationTable.status, 'pending'))
    .limit(50)

  let processed = 0
  for (const item of due) {
    if (item.scheduledAt > now) continue
    try {
      if (item.kind === 'write_review' && item.orderId) {
        const [order] = await db.select().from(orderTable).where(eq(orderTable.id, item.orderId)).limit(1)
        if (order) {
          await callFlowxo({
            scenario: 'WRITE_REVIEW',
            orderId: order.id,
            responsePath: order.responsePath || undefined,
            language: languageFromOrder(order),
          })
        }
      }
      await db
        .update(pendingNotificationTable)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(pendingNotificationTable.id, item.id))
      processed += 1
    } catch (err) {
      logger.warn({ err, id: item.id }, '[notify] processing failed')
      await db
        .update(pendingNotificationTable)
        .set({
          attempts: (item.attempts ?? 0) + 1,
          lastError: err instanceof Error ? err.message : String(err),
          status: (item.attempts ?? 0) >= 5 ? 'failed' : 'pending',
          updatedAt: new Date(),
        })
        .where(eq(pendingNotificationTable.id, item.id))
    }
  }
  return processed
}
