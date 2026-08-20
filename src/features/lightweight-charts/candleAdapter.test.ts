import { describe, expect, it } from 'vitest'
import type { UTCTimestamp } from 'lightweight-charts'
import type { Candle } from '../../domain/candles/types'
import {
  createVisibleLogicalRange,
  toLightweightCandle,
  toLightweightCandles,
} from './candleAdapter'

const candle: Candle = {
  timestamp: 1_720_000_005_999,
  open: 100,
  high: 103,
  low: 99,
  close: 102,
  volume: 42,
}

describe('toLightweightCandle', () => {
  it('converts a millisecond Candle into the library OHLC shape', () => {
    expect(toLightweightCandle(candle)).toEqual({
      time: 1_720_000_005 as UTCTimestamp,
      open: 100,
      high: 103,
      low: 99,
      close: 102,
    })
  })
})

describe('toLightweightCandles', () => {
  it('keeps source order without mutating the domain array', () => {
    const candles: Candle[] = [
      candle,
      {
        ...candle,
        timestamp: candle.timestamp + 5_000,
        open: 102,
        close: 101,
      },
    ]
    const snapshot = structuredClone(candles)

    expect(toLightweightCandles(candles)).toEqual([
      {
        time: 1_720_000_005 as UTCTimestamp,
        open: 100,
        high: 103,
        low: 99,
        close: 102,
      },
      {
        time: 1_720_000_010 as UTCTimestamp,
        open: 102,
        high: 103,
        low: 99,
        close: 101,
      },
    ])
    expect(candles).toEqual(snapshot)
  })
})

describe('createVisibleLogicalRange', () => {
  it('selects the requested trailing candle window with right spacing', () => {
    expect(createVisibleLogicalRange(120, 12)).toEqual({
      from: 108,
      to: 119.5,
    })
  })

  it('clamps a non-positive visible count to one candle', () => {
    expect(createVisibleLogicalRange(3, 0)).toEqual({
      from: 2,
      to: 2.5,
    })
  })

  it('returns null when there is no series data', () => {
    expect(createVisibleLogicalRange(0, 12)).toBeNull()
  })
})
