import { describe, it, expect } from 'vitest'
import { formatCurrency, now, parseDateLocal } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats BRL with comma decimal separator', () => {
    const result = formatCurrency(1500.5, 'pt-BR')
    expect(result).toContain('1.500')
    expect(result).toContain(',50')
  })

  it('formats USD with period decimal separator', () => {
    const result = formatCurrency(1500.5, 'en-US')
    expect(result).toContain('1,500')
    expect(result).toContain('.50')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('formats large values without overflow', () => {
    const result = formatCurrency(1_000_000)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('now', () => {
  it('returns a valid ISO 8601 string', () => {
    const result = now()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(() => new Date(result)).not.toThrow()
  })
})

describe('parseDateLocal', () => {
  it('returns a Date with the correct year, month and day in local time', () => {
    const d = parseDateLocal('2026-04-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(3) // April = 3 (0-indexed)
    expect(d.getDate()).toBe(1)
  })

  it('ignores any time component after the date part', () => {
    const d = parseDateLocal('2026-11-15T00:00:00.000Z')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10) // November = 10
    expect(d.getDate()).toBe(15)
  })

  it('parses the last day of the year correctly', () => {
    const d = parseDateLocal('2025-12-31')
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth()).toBe(11) // December = 11
    expect(d.getDate()).toBe(31)
  })
})
