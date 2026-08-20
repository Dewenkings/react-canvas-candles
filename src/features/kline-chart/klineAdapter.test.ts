import { describe, expect, it } from 'vitest'
import type { Candle } from '../../domain/candles/types'
import { toKLineData, toKLineDataList } from './klineAdapter'

const candle: Candle = {
  timestamp: 1_720_000_005_000,
  open: 100,
  high: 103,
  low: 99,
  close: 102,
  volume: 42,
}

describe('toKLineData', () => {
  it('preserves the millisecond timestamp and OHLCV fields', () => {
    expect(toKLineData(candle)).toEqual({
      timestamp: 1_720_000_005_000,
      open: 100,
      high: 103,
      low: 99,
      close: 102,
      volume: 42,
    })
  })
})

describe('toKLineDataList', () => {
  it('keeps source order without mutating domain Candles', () => {
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

    expect(toKLineDataList(candles)).toEqual([
      {
        timestamp: 1_720_000_005_000,
        open: 100,
        high: 103,
        low: 99,
        close: 102,
        volume: 42,
      },
      {
        timestamp: 1_720_000_010_000,
        open: 102,
        high: 103,
        low: 99,
        close: 101,
        volume: 42,
      },
    ])
    expect(candles).toEqual(snapshot)
  })
})
