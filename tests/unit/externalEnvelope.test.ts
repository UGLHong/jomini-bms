import { describe, expect, it } from 'vitest'
import {
  externalOrderEnvelope,
  formatMytDateTime,
  legacyEnvelope,
} from '@/server/utils/externalEnvelope'
import type { OrderRow } from '@/server/db/schema'

function makeOrderRow(partial: Partial<OrderRow> = {}): OrderRow {
  const now = new Date('2026-02-01T12:00:00Z')
  return {
    id: 'ABC1234567',
    createdAt: now,
    updatedAt: now,
    doneAt: null,
    processAt: null,
    userId: 'usr_1',
    ign: '',
    fullname: 'Test User',
    gender: '',
    phone: '',
    email: '',
    gameKey: 'mlbb',
    gameId: '123456789 1234',
    buyAmount: '86',
    paidAmount: '6',
    costPrice: '4.95',
    profit: '1.05',
    receiptUrl: '',
    processSuccessful: [],
    processPending: [],
    processFailed: [],
    processStatus: 'open',
    supplierKey: 'smile',
    lastProcessBy: null,
    processMethod: '',
    remark: '',
    source: 'flowxo_bot',
    amountCombinationString: '86',
    responsePath: 'psid_123',
    telegramOrderMsgId: '',
    channel: 'messenger',
    language: 'Bahasa Melayu',
    prevOrderCount: 0,
    prevOrderIdCount: 0,
    ...partial,
  }
}

describe('externalEnvelope', () => {
  it('wraps data in the legacy { status, message, data } envelope', () => {
    const wrapped = legacyEnvelope({ hello: 'world' })
    expect(wrapped).toEqual({
      status: 'success',
      message: '',
      data: { hello: 'world' },
    })
  })

  it('includes all legacy order fields + dropped columns as empty defaults', () => {
    const envelope = externalOrderEnvelope(makeOrderRow())
    const expectedKeys = [
      'id',
      'createdAt',
      'doneAt',
      'processAt',
      'userId',
      'ign',
      'fullname',
      'gender',
      'phone',
      'email',
      'game',
      'gameId',
      'buyAmount',
      'paidAmount',
      'costPrice',
      'profit',
      'receiptUrl',
      'processSuccessful',
      'processPending',
      'processFailed',
      'processStatus',
      'supplier',
      'lastProcessBy',
      'processMethod',
      'remark',
      'source',
      'amountCombinationString',
      'responsePath',
      'telegramOrderMsgId',
      'channel',
      'language',
      'prevOrderCount',
      'prevOrderIdCount',
      'priceModifier',
      'invoiceId',
      'paymentStatus',
      'enablePaymentGateway',
      'checkUrls',
    ]
    for (const key of expectedKeys) {
      expect(envelope).toHaveProperty(key)
    }
    expect(envelope.priceModifier).toBe(0)
    expect(envelope.invoiceId).toBe('')
    expect(envelope.paymentStatus).toBe('')
    expect(envelope.enablePaymentGateway).toBe(false)
    expect(envelope.checkUrls).toEqual([])
    expect(envelope.game).toBe('mlbb')
    expect(envelope.supplier).toBe('smile')
    expect(envelope.buyAmount).toBe(86)
    expect(envelope.paidAmount).toBe(6)
  })

  it('formats Asia/Kuala_Lumpur datetime in M/D/YYYY, H:MM:SS AM/PM', () => {
    const formatted = formatMytDateTime(new Date('2026-02-01T00:00:00Z'))
    expect(formatted).toMatch(/^\d{1,2}\/\d{1,2}\/2026, \d{1,2}:\d{2}:\d{2} (AM|PM)$/)
  })
})
