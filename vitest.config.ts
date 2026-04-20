import { defineConfig } from 'vitest/config'
import path from 'node:path'

const root = path.resolve('.')

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      '~': root,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.ts', 'server/**/__tests__/**/*.{test,spec}.ts'],
  },
})
