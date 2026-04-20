import type { OrderRow } from '@/server/db/schema'
import { formatMytDateTime } from '@/server/utils/externalEnvelope'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function renderInternalOrderMessage(order: OrderRow): string {
  const lines = [
    `<b>New order</b> <code>#${order.id}</code>`,
    `Customer: ${escapeHtml(order.fullname || '—')}`,
    `Phone: ${escapeHtml(order.phone || '—')}`,
    `Game: ${escapeHtml(order.gameKey)}  ID: <code>${escapeHtml(order.gameId || '—')}</code>`,
    `Buy: ${order.buyAmount}  Paid: RM ${order.paidAmount}`,
    `Supplier: ${escapeHtml(order.supplierKey)}`,
  ]
  if (order.amountCombinationString) {
    lines.push(`Split: <code>${escapeHtml(order.amountCombinationString)}</code>`)
  }
  if (order.remark) {
    lines.push(`Remark: ${escapeHtml(order.remark)}`)
  }
  lines.push(`At: ${formatMytDateTime(order.createdAt)}`)
  return lines.join('\n')
}

export function renderSupplierRelayMessage(order: OrderRow): string {
  return [
    `<b>Order</b> <code>#${order.id}</code>`,
    `Game: ${escapeHtml(order.gameKey)}`,
    `Game ID: <code>${escapeHtml(order.gameId || '—')}</code>`,
    `IGN: ${escapeHtml(order.ign || '—')}`,
    `Amount: ${order.buyAmount}`,
    order.amountCombinationString ? `Split: <code>${escapeHtml(order.amountCombinationString)}</code>` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function renderOrderDoneMessage(order: OrderRow): string {
  return [
    `<b>Order done</b> <code>#${order.id}</code>`,
    `Customer: ${escapeHtml(order.fullname)}`,
    `Game: ${escapeHtml(order.gameKey)} / ${escapeHtml(order.gameId)}`,
    `Done at: ${formatMytDateTime(order.doneAt ?? new Date())}`,
  ].join('\n')
}
