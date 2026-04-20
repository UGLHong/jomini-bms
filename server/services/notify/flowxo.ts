import { useRuntimeConfig } from '#imports'
import { logger } from '@/server/utils/logger'
import type { OrderRow } from '@/server/db/schema'

export type FlowxoScenario =
  | 'GAME_ID_INVALID'
  | 'INCOMPLETE_DATA'
  | 'ORDER_RECEIVED'
  | 'ORDER_DONE'
  | 'ORDER_REJECTED'
  | 'WRITE_REVIEW'
  | 'STOCK_UNAVAILABLE'

export type FlowxoPayload = {
  scenario: FlowxoScenario
  orderId?: string
  responsePath?: string
  language?: 'en' | 'ms'
  fullname?: string
  gameKey?: string
  gameId?: string
  buyAmount?: string | number
  paidAmount?: string | number
  message?: string
}

export async function callFlowxo(payload: FlowxoPayload): Promise<boolean> {
  const config = useRuntimeConfig()
  const url = String(config.flowxoCallbackUrl ?? '')
  if (!url) return false

  try {
    await $fetch(url, { method: 'POST', body: payload, timeout: 10_000 })
    return true
  } catch (err) {
    logger.warn({ err, scenario: payload.scenario }, '[flowxo] call failed')
    return false
  }
}

export function languageFromOrder(order: Pick<OrderRow, 'language'>): 'en' | 'ms' {
  const lang = (order.language || '').toLowerCase()
  if (lang.includes('english') || lang === 'en') return 'en'
  return 'ms'
}
