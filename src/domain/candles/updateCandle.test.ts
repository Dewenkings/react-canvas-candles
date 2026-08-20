import { describe, expect, it } from 'vitest'
import { updateCandle } from './updateCandle'
import type { Candle } from './types'

const intervalMs = 60_000

function createCandles(): Candle[] {
  return [
    {
      timestamp: Date.UTC(2025, 0, 1, 10, 0),
      open: 100,
      high: 104,
      low: 98,
      close: 102,
      volume: 10,
    },
    {
      timestamp: Date.UTC(2025, 0, 1, 10, 1),
      open: 102,
      high: 105,
      low: 101,
      close: 104,
      volume: 20,
    },
  ]
}

describe('updateCandle', () => {
  it('updates close, high, and volume for a higher tick in the current period', () => {
    const result = updateCandle(
      createCandles(),
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 1, 30),
        price: 107,
        volume: 3,
      },
      intervalMs,
    )

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({
      timestamp: Date.UTC(2025, 0, 1, 10, 1),
      open: 102,
      high: 107,
      low: 101,
      close: 107,
      volume: 23,
    })
  })

  it('updates close and low without reducing the existing high', () => {
    const result = updateCandle(
      createCandles(),
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 1, 40),
        price: 99,
        volume: 2,
      },
      intervalMs,
    )

    expect(result[1]).toMatchObject({
      open: 102,
      high: 105,
      low: 99,
      close: 99,
      volume: 22,
    })
  })

  it('appends one candle aligned to a newer tick period without filling gaps', () => {
    const result = updateCandle(
      createCandles(),
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 4, 15),
        price: 100,
        volume: 4,
      },
      intervalMs,
    )

    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({
      timestamp: Date.UTC(2025, 0, 1, 10, 4),
      open: 104,
      high: 104,
      low: 100,
      close: 100,
      volume: 4,
    })
  })

  it('does not mutate the input array or its last candle', () => {
    const candles = createCandles()
    const originalLast = candles[1]
    const snapshot = structuredClone(candles)

    const result = updateCandle(
      candles,
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 1, 30),
        price: 107,
        volume: 3,
      },
      intervalMs,
    )

    expect(result).not.toBe(candles)
    expect(result[1]).not.toBe(originalLast)
    expect(candles).toEqual(snapshot)
  })

  it('creates the first candle from a tick when history is empty', () => {
    const result = updateCandle(
      [],
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 1, 37),
        price: 101,
        volume: 5,
      },
      intervalMs,
    )

    expect(result).toEqual([
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 1),
        open: 101,
        high: 101,
        low: 101,
        close: 101,
        volume: 5,
      },
    ])
  })

  it('ignores a tick older than the latest candle period', () => {
    const candles = createCandles()
    const result = updateCandle(
      candles,
      {
        timestamp: Date.UTC(2025, 0, 1, 10, 0, 30),
        price: 90,
        volume: 1,
      },
      intervalMs,
    )

    expect(result).toBe(candles)
  })
})
