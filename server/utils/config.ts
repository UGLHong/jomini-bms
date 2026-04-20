import { useRuntimeConfig } from '#imports'

export function serverConfig() {
  return useRuntimeConfig()
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
