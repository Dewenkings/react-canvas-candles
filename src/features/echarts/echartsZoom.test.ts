import { describe, expect, it } from 'vitest'
import { getEChartsZoomRange } from './echartsZoom'

describe('getEChartsZoomRange', () => {
  it('selects the latest requested number of candles', () => {
    expect(getEChartsZoomRange(120, 80)).toEqual({
      startValue: 40,
      endValue: 119,
    })
  })

  it('starts at zero when the dataset is shorter than the window', () => {
    expect(getEChartsZoomRange(3, 80)).toEqual({
      startValue: 0,
      endValue: 2,
    })
  })

  it('returns a stable empty range without negative indexes', () => {
    expect(getEChartsZoomRange(0, 80)).toEqual({
      startValue: 0,
      endValue: 0,
    })
  })

  it('treats a non-positive visible count as one candle', () => {
    expect(getEChartsZoomRange(3, 0)).toEqual({
      startValue: 2,
      endValue: 2,
    })
  })
})
