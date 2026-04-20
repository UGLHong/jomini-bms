import type { SupplierApiConfig, SupplierSubmissionStatus } from '@/server/db/schema'

export type SubmitArgs = {
  config: SupplierApiConfig
  apiKey: string
  idtrx: string
  serviceId: string
  target: string
  contact: string
  callbackUrl?: string
}

export type SubmitResult = {
  ok: boolean
  status: SupplierSubmissionStatus
  externalInvoice?: string
  message: string
  raw: Record<string, unknown>
}

export type StatusArgs = {
  config: SupplierApiConfig
  apiKey: string
  externalInvoice: string
}

export type StatusResult = {
  ok: boolean
  status: SupplierSubmissionStatus
  message: string
  raw: Record<string, unknown>
}

export type BalanceResult = {
  ok: boolean
  balance: number | null
  message: string
  raw: Record<string, unknown>
}

export type ServiceCatalogItem = {
  id: string
  name: string
  category?: string
  price?: number
  status?: string
}

export type ServiceCatalogResult = {
  ok: boolean
  items: ServiceCatalogItem[]
  message: string
  raw: Record<string, unknown>
}

export type SupplierApiAdapter = {
  kind: string
  submit(args: SubmitArgs): Promise<SubmitResult>
  status(args: StatusArgs): Promise<StatusResult>
  balance(config: SupplierApiConfig, apiKey: string): Promise<BalanceResult>
  listServices?(config: SupplierApiConfig, apiKey: string): Promise<ServiceCatalogResult>
}
