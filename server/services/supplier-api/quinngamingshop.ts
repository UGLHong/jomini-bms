import type { SupplierApiConfig, SupplierSubmissionStatus } from '@/server/db/schema'
import type {
  BalanceResult,
  ServiceCatalogResult,
  StatusArgs,
  StatusResult,
  SubmitArgs,
  SubmitResult,
  SupplierApiAdapter,
} from './types'

const DEFAULT_BASE_URL = 'https://api.quinngamingshop.com'
const REQUEST_TIMEOUT_MS = 15_000

type QuinnResponse<T = unknown> = {
  status: boolean
  msg: string
  data: T
}

function resolveBaseUrl(config: SupplierApiConfig): string {
  const url = (config.baseUrl || DEFAULT_BASE_URL).trim()
  return url.endsWith('/') ? url.slice(0, -1) : url
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<QuinnResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const text = await res.text()
    try {
      return JSON.parse(text) as QuinnResponse<T>
    } catch {
      return { status: false, msg: `invalid_json:${text.slice(0, 200)}`, data: null as unknown as T }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: false, msg: `network_error:${message}`, data: null as unknown as T }
  } finally {
    clearTimeout(timer)
  }
}

function mapStatus(raw: string | undefined): SupplierSubmissionStatus {
  const s = (raw ?? '').toLowerCase()
  if (s === 'success') return 'success'
  if (s === 'processing') return 'processing'
  if (s === 'cancel') return 'cancel'
  if (s === 'refund') return 'refund'
  if (s === 'pending') return 'pending'
  return 'error'
}

type QuinnOrderData = {
  id?: string
  service_name?: string
  service_id?: string
  target?: string
  kontak?: string
  keterangan?: string
  status?: string
}

type QuinnStatusData = {
  id?: string
  keterangan?: string
  status?: string
}

type QuinnBalanceData = { saldo?: number }

type QuinnServiceItem = {
  id?: string
  nama_layanan?: string
  kategori?: string
  harga?: number
  status?: string
}

export const quinngamingshopAdapter: SupplierApiAdapter = {
  kind: 'quinngamingshop',

  async submit({ config, apiKey, idtrx, serviceId, target, contact, callbackUrl }: SubmitArgs): Promise<SubmitResult> {
    const body: Record<string, unknown> = {
      api_key: apiKey,
      service_id: serviceId,
      target,
      kontak: contact || '-',
      idtrx,
    }
    if (callbackUrl) body.callback = callbackUrl

    const res = await postJson<QuinnOrderData>(`${resolveBaseUrl(config)}/order`, body)
    const data = (res.data ?? {}) as QuinnOrderData
    const duplicate = (res.msg ?? '').toLowerCase().includes('idtrx sudah ada')

    return {
      ok: res.status === true,
      status: res.status ? mapStatus(data.status ?? 'pending') : duplicate ? 'pending' : 'error',
      externalInvoice: data.id,
      message: res.msg ?? '',
      raw: res as unknown as Record<string, unknown>,
    }
  },

  async status({ config, apiKey, externalInvoice }: StatusArgs): Promise<StatusResult> {
    const res = await postJson<QuinnStatusData>(`${resolveBaseUrl(config)}/status`, {
      api_key: apiKey,
      order_id: externalInvoice,
    })
    const data = (res.data ?? {}) as QuinnStatusData
    return {
      ok: res.status === true,
      status: res.status ? mapStatus(data.status) : 'error',
      message: [res.msg, data.keterangan].filter(Boolean).join(' | '),
      raw: res as unknown as Record<string, unknown>,
    }
  },

  async balance(config: SupplierApiConfig, apiKey: string): Promise<BalanceResult> {
    const res = await postJson<QuinnBalanceData>(`${resolveBaseUrl(config)}/saldo`, { api_key: apiKey })
    const data = (res.data ?? {}) as QuinnBalanceData
    return {
      ok: res.status === true,
      balance: typeof data.saldo === 'number' ? data.saldo : null,
      message: res.msg ?? '',
      raw: res as unknown as Record<string, unknown>,
    }
  },

  async listServices(config: SupplierApiConfig, apiKey: string): Promise<ServiceCatalogResult> {
    const res = await postJson<QuinnServiceItem[]>(`${resolveBaseUrl(config)}/service`, { api_key: apiKey })
    const data = Array.isArray(res.data) ? res.data : []
    return {
      ok: res.status === true,
      items: data.map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.nama_layanan ?? ''),
        category: item.kategori,
        price: typeof item.harga === 'number' ? item.harga : undefined,
        status: item.status,
      })),
      message: res.msg ?? '',
      raw: res as unknown as Record<string, unknown>,
    }
  },
}
