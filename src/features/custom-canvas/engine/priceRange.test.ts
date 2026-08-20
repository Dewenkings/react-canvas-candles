import { describe, expect, it } from 'vitest'
import type { Candle } from '../../../domain/candles/types'
import { calculatePriceRange } from './priceRange'

function createCandle(low: number, high: number): Candle {
  const midpoint = (low + high) / 2

  return {
    timestamp: 0,
    open: midpoint,
    high,
    low,
    close: midpoint,
    volume: 10,
  }
}

describe('calculatePriceRange', () => {
  it('uses the lowest low and highest high with five-percent padding', () => {
    const candles = [createCandle(95, 105), createCandle(90, 110)]

    expect(calculatePriceRange(candles)).toEqual({ min: 89, max: 111 })
  })

  it('adds one-percent padding to a flat positive price', () => {
    expect(calculatePriceRange([createCandle(100, 100)])).toEqual({
      min: 99,
      max: 101,
    })
  })

  it('adds a minimum one-unit padding to a flat zero price', () => {
    expect(calculatePriceRange([createCandle(0, 0)])).toEqual({
      min: -1,
      max: 1,
    })
  })

  it('returns null for empty input', () => {
    expect(calculatePriceRange([])).toBeNull()
  })
})
