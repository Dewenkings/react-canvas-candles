import { describe, expect, it } from 'vitest'
import type { Candle } from '../../../domain/candles/types'
import { createChartFrameModel } from './createChartFrameModel'

const candles: Candle[] = [
  {
    timestamp: 1_000,
    open: 100,
    high: 102,
    low: 99,
    close: 101,
    volume: 10,
  },
  {
    timestamp: 2_000,
    open: 101,
    high: 105,
    low: 98,
    close: 103,
    volume: 20,
  },
  {
    timestamp: 3_000,
    open: 103,
    high: 104,
    low: 100,
    close: 102,
    volume: 30,
  },
]

describe('createChartFrameModel', () => {
  it('assembles visible data, plot geometry, range, and scales', () => {
    const model = createChartFrameModel({
      candles,
      visibleCount: 2,
      width: 800,
      height: 420,
    })

    expect(model?.visibleCandles).toEqual(candles.slice(-2))
    expect(model?.plotRect).toEqual({
      left: 12,
      top: 20,
      width: 724,
      height: 372,
    })
    expect(model?.priceRange.min).toBeLessThan(98)
    expect(model?.priceRange.max).toBeGreaterThan(105)
    expect(model?.scales.toX(0)).toBeGreaterThan(12)
  })

  it('returns null when there are no visible candles', () => {
    expect(
      createChartFrameModel({
        candles: [],
        visibleCount: 10,
        width: 800,
        height: 420,
      }),
    ).toBeNull()
  })

  it('returns null when insets leave no drawable width', () => {
    expect(
      createChartFrameModel({
        candles,
        visibleCount: 3,
        width: 70,
        height: 420,
      }),
    ).toBeNull()
  })
})
