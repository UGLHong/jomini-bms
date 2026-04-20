import { describe, expect, it } from 'vitest'
import { parseAmount } from '@/server/utils/parseAmount'

describe('parseAmount', () => {
  it('extracts the first decimal number from a string', () => {
    expect(parseAmount('RM 12.50')).toBe(12.5)
    expect(parseAmount('12')).toBe(12)
    expect(parseAmount('86 Diamonds')).toBe(86)
  })

  it('returns 0 for non-numeric inputs', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('n/a')).toBe(0)
    expect(parseAmount(null)).toBe(0)
    expect(parseAmount(undefined)).toBe(0)
  })

  it('accepts numeric input as-is', () => {
    expect(parseAmount(42)).toBe(42)
    expect(parseAmount(0)).toBe(0)
  })

  it('uses the first numeric match in mixed strings', () => {
    expect(parseAmount('100 + 86')).toBe(100)
    expect(parseAmount('.50 cents')).toBe(0.5)
  })
})
