import { describe, expect, it } from 'vitest'
import { generateCandles } from './generateCandles'
import type { GenerateCandlesOptions } from './types'

const options: GenerateCandlesOptions = {
  count: 3,
  intervalMs: 60_000,
  endTimestamp: Date.UTC(2025, 0, 1, 10, 1, 37),
  startPrice: 100,
  seed: 42,
}

describe('generateCandles', () => {
  it('returns the requested number of candles with aligned consecutive timestamps', () => {
    const candles = generateCandles(options)

    expect(candles).toHaveLength(3)
    expect(candles.map((candle) => candle.timestamp)).toEqual([
      Date.UTC(2025, 0, 1, 9, 59),
      Date.UTC(2025, 0, 1, 10, 0),
      Date.UTC(2025, 0, 1, 10, 1),
    ])
  })

  it('opens each candle at the previous close', () => {
    const candles = generateCandles(options)

    expect(candles[1].open).toBe(candles[0].close)
    expect(candles[2].open).toBe(candles[1].close)
  })

  it('keeps every candle inside valid OHLC and volume bounds', () => {
    const candles = generateCandles(options)

    for (const candle of candles) {
      expect(candle.high).toBeGreaterThanOrEqual(candle.open)
      expect(candle.high).toBeGreaterThanOrEqual(candle.close)
      expect(candle.low).toBeLessThanOrEqual(candle.open)
      expect(candle.low).toBeLessThanOrEqual(candle.close)
      expect(candle.low).toBeGreaterThan(0)
      expect(candle.volume).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns identical candles for identical seeded options', () => {
    expect(generateCandles(options)).toEqual(generateCandles(options))
  })

  it('returns an empty array when count is zero', () => {
    expect(generateCandles({ ...options, count: 0 })).toEqual([])
  })
})
