import { afterEach, describe, expect, it, vi } from 'vitest'
import { quinngamingshopAdapter } from '@/server/services/supplier-api/quinngamingshop'

const baseConfig = { kind: 'quinngamingshop' as const, baseUrl: 'https://api.quinngamingshop.com' }

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchOnce(body: unknown, init: ResponseInit = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(body), init)))
}

describe('quinngamingshopAdapter', () => {
  it('submit returns externalInvoice on success', async () => {
    mockFetchOnce({
      status: true,
      msg: 'Pesanan berhasil',
      data: { id: 'ORDER123', service_id: 'ML86', status: 'pending' },
    })
    const result = await quinngamingshopAdapter.submit({
      config: baseConfig,
      apiKey: 'KEY',
      idtrx: 'abc-1',
      serviceId: 'ML86',
      target: '123|456',
      contact: '6012000',
    })
    expect(result.ok).toBe(true)
    expect(result.externalInvoice).toBe('ORDER123')
    expect(result.status).toBe('pending')
  })

  it('submit treats duplicate idtrx as pending (idempotent retry)', async () => {
    mockFetchOnce({ status: false, msg: 'idtrx sudah ada', data: [] })
    const result = await quinngamingshopAdapter.submit({
      config: baseConfig,
      apiKey: 'KEY',
      idtrx: 'abc-1',
      serviceId: 'ML86',
      target: '123|456',
      contact: '',
    })
    expect(result.ok).toBe(false)
    expect(result.status).toBe('pending')
  })

  it('status maps supplier status strings to internal enum', async () => {
    mockFetchOnce({
      status: true,
      msg: 'berhasil mengecek status',
      data: { id: 'ORDER1', status: 'success', keterangan: 'SN:123' },
    })
    const result = await quinngamingshopAdapter.status({
      config: baseConfig,
      apiKey: 'KEY',
      externalInvoice: 'ORDER1',
    })
    expect(result.status).toBe('success')
    expect(result.message).toContain('SN:123')
  })

  it('balance parses saldo number', async () => {
    mockFetchOnce({ status: true, msg: 'berhasil', data: { saldo: 30740 } })
    const result = await quinngamingshopAdapter.balance(baseConfig, 'KEY')
    expect(result.ok).toBe(true)
    expect(result.balance).toBe(30740)
  })

  it('network failure degrades gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('boom')))
    const result = await quinngamingshopAdapter.balance(baseConfig, 'KEY')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('network_error')
  })
})
