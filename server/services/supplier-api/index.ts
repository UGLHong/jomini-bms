import type { SupplierApiConfig } from '@/server/db/schema'
import { quinngamingshopAdapter } from './quinngamingshop'
import type { SupplierApiAdapter } from './types'

const adapters: Record<string, SupplierApiAdapter> = {
  quinngamingshop: quinngamingshopAdapter,
}

export function resolveAdapter(kind: string | undefined): SupplierApiAdapter | null {
  if (!kind || kind === 'none') return null
  return adapters[kind] ?? null
}

export function hasApiIntegration(config: SupplierApiConfig | null | undefined, apiKey: string | null): boolean {
  if (!config || config.kind === 'none' || !config.kind) return false
  if (!apiKey) return false
  return resolveAdapter(config.kind) !== null
}

export * from './types'
