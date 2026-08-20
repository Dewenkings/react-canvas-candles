import { describe, expect, it } from 'vitest'
import type { Candle } from '../../domain/candles/types'
import { toEChartsMarketData } from './echartsAdapter'

const rising: Candle = {
  timestamp: 1_720_000_005_000,
  open: 100,
  high: 104,
  low: 98,
  close: 103,
  volume: 42,
}

const falling: Candle = {
  timestamp: 1_720_000_010_000,
  open: 103,
  high: 105,
  low: 99,
  close: 101,
  volume: 27,
}

describe('toEChartsMarketData', () => {
  it('uses the ECharts candlestick value order', () => {
    expect(toEChartsMarketData([rising]).candleValues).toEqual([
      [100, 103, 98, 104],
    ])
  })

  it('preserves timestamps and colors volume by price direction', () => {
    const result = toEChartsMarketData([rising, falling])

    expect(result.timestamps).toEqual([
      1_720_000_005_000,
      1_720_000_010_000,
    ])
    expect(result.volumeValues).toEqual([
      {
        value: 42,
        itemStyle: { color: '#22c55e' },
      },
      {
        value: 27,
        itemStyle: { color: '#ef4444' },
      },
    ])
  })

  it('does not mutate domain Candles', () => {
    const candles = [rising, falling]
    const snapshot = structuredClone(candles)

    toEChartsMarketData(candles)

    expect(candles).toEqual(snapshot)
  })
})
