import { describe, expect, it } from 'vitest'
import type { Candle } from '../../../domain/candles/types'
import { getVisibleCandles } from './visibleCandles'

function createCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: index * 60_000,
    open: 100 + index,
    high: 102 + index,
    low: 98 + index,
    close: 101 + index,
    volume: 10 + index,
  }))
}

describe('getVisibleCandles', () => {
  it('returns the last 80 candles by default', () => {
    const candles = createCandles(100)

    const result = getVisibleCandles(candles)

    expect(result).toHaveLength(80)
    expect(result[0]).toEqual(candles[20])
    expect(result.at(-1)).toEqual(candles[99])
  })

  it('returns all candles in a new array when fewer than the limit exist', () => {
    const candles = createCandles(3)

    const result = getVisibleCandles(candles)

    expect(result).toEqual(candles)
    expect(result).not.toBe(candles)
  })

  it('returns an empty array for empty input', () => {
    expect(getVisibleCandles([])).toEqual([])
  })

  it('supports a custom visible limit', () => {
    const candles = createCandles(5)

    expect(getVisibleCandles(candles, 2)).toEqual(candles.slice(3))
  })

  it('returns an empty array when the visible limit is zero', () => {
    expect(getVisibleCandles(createCandles(5), 0)).toEqual([])
  })

  it('treats a negative visible limit as zero', () => {
    expect(getVisibleCandles(createCandles(5), -2)).toEqual([])
  })

  it('does not mutate the input array', () => {
    const candles = createCandles(5)
    const snapshot = structuredClone(candles)

    getVisibleCandles(candles, 2)

    expect(candles).toEqual(snapshot)
  })
})
