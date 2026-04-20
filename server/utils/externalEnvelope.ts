import type { OrderRow } from '@/server/db/schema'

const ORDER_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
}

export function formatMytDateTime(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (!Number.isFinite(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', ORDER_DATE_FORMAT).format(d)
}

export function legacyEnvelope<T>(data: T, message = ''): { status: 'success'; message: string; data: T } {
  return { status: 'success', message, data }
}

export function externalOrderEnvelope(order: OrderRow): Record<string, unknown> {
  return {
    id: order.id,
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt ?? '',
    doneAt: order.doneAt ? order.doneAt.toISOString() : '',
    processAt: order.processAt ? order.processAt.toISOString() : '',
    userId: order.userId ?? '',
    ign: order.ign ?? '',
    fullname: order.fullname ?? '',
    gender: order.gender ?? '',
    phone: order.phone ?? '',
    email: order.email ?? '',
    game: order.gameKey ?? '',
    gameId: order.gameId ?? '',
    buyAmount: Number(order.buyAmount ?? 0),
    paidAmount: Number(order.paidAmount ?? 0),
    costPrice: Number(order.costPrice ?? 0),
    profit: Number(order.profit ?? 0),
    receiptUrl: order.receiptUrl ?? '',
    processSuccessful: order.processSuccessful ?? [],
    processPending: order.processPending ?? [],
    processFailed: order.processFailed ?? [],
    processStatus: order.processStatus ?? 'open',
    supplier: order.supplierKey ?? '',
    lastProcessBy: order.lastProcessBy ?? null,
    processMethod: order.processMethod ?? '',
    remark: order.remark ?? '',
    source: order.source ?? '',
    amountCombinationString: order.amountCombinationString ?? '',
    responsePath: order.responsePath ?? '',
    telegramOrderMsgId: order.telegramOrderMsgId ?? '',
    channel: order.channel ?? 'web',
    language: order.language ?? 'Bahasa Melayu',
    prevOrderCount: Number(order.prevOrderCount ?? 0),
    prevOrderIdCount: Number(order.prevOrderIdCount ?? 0),
    priceModifier: 0,
    invoiceId: '',
    paymentStatus: '',
    enablePaymentGateway: false,
    checkUrls: [] as string[],
  }
}
