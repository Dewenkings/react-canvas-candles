import { describe, expect, it } from 'vitest'
import type { Candle } from '../../domain/candles/types'
import {
  createEChartsDataUpdate,
  createEChartsOption,
  createEChartsZoomUpdate,
  formatEChartsAxisPointerLabel,
  formatEChartsTime,
  formatEChartsTooltip,
} from './echartsOption'

const candles: Candle[] = [
  {
    timestamp: 1_000,
    open: 100,
    high: 104,
    low: 98,
    close: 103,
    volume: 42,
  },
  {
    timestamp: 2_000,
    open: 103,
    high: 105,
    low: 99,
    close: 101,
    volume: 27,
  },
]

describe('createEChartsOption', () => {
  it('builds linked candlestick and volume panes from one dataset', () => {
    const option = createEChartsOption(candles, 1)

    expect(option).toMatchObject({
      animation: false,
      axisPointer: {
        link: [{ xAxisIndex: [0, 1] }],
      },
      xAxis: [
        { gridIndex: 0, data: [1_000, 2_000] },
        { gridIndex: 1, data: [1_000, 2_000] },
      ],
      dataZoom: [
        { id: 'inside', startValue: 1, endValue: 1 },
        { id: 'slider', startValue: 1, endValue: 1 },
      ],
      series: [
        {
          id: 'candles',
          type: 'candlestick',
          data: [
            [100, 103, 98, 104],
            [103, 101, 99, 105],
          ],
        },
        {
          id: 'volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
        },
      ],
    })
  })
})

describe('formatEChartsTime', () => {
  it('formats a timestamp in local time with zero padding', () => {
    const timestamp = new Date(2026, 7, 20, 3, 4, 5).getTime()

    expect(formatEChartsTime(timestamp)).toBe('03:04:05')
  })
})

describe('formatEChartsTooltip', () => {
  it('uses local time and semantic OHLC labels instead of milliseconds', () => {
    const timestamp = new Date(2026, 7, 20, 3, 4, 5).getTime()

    expect(
      formatEChartsTooltip([
        {
          axisValue: timestamp,
          marker: '● ',
          seriesType: 'candlestick',
          value: [100, 103, 98, 104],
        },
        {
          axisValue: timestamp,
          marker: '■ ',
          seriesType: 'bar',
          value: 42,
        },
      ]),
    ).toBe(
      '03:04:05<br/>● 开 100.0000 · 收 103.0000 · 低 98.0000 · 高 104.0000<br/>■ Volume 42',
    )
  })
})

describe('formatEChartsAxisPointerLabel', () => {
  it('formats only the x-axis as local time', () => {
    const timestamp = new Date(2026, 7, 20, 3, 4, 5).getTime()

    expect(
      formatEChartsAxisPointerLabel({
        axisDimension: 'x',
        value: timestamp,
      }),
    ).toBe('03:04:05')
    expect(
      formatEChartsAxisPointerLabel({
        axisDimension: 'y',
        value: 102.125,
      }),
    ).toBe('102.125')
  })
})

describe('createEChartsDataUpdate', () => {
  it('updates only axes and series without overwriting DataZoom', () => {
    const update = createEChartsDataUpdate(candles)

    expect(update).toMatchObject({
      xAxis: [
        { data: [1_000, 2_000] },
        { data: [1_000, 2_000] },
      ],
      series: [
        { id: 'candles', data: [[100, 103, 98, 104], [103, 101, 99, 105]] },
        { id: 'volume' },
      ],
    })
    expect(update).not.toHaveProperty('dataZoom')
  })
})

describe('createEChartsZoomUpdate', () => {
  it('updates both zoom controls to the same visible range', () => {
    expect(createEChartsZoomUpdate(120, 80)).toEqual({
      dataZoom: [
        { id: 'inside', startValue: 40, endValue: 119 },
        { id: 'slider', startValue: 40, endValue: 119 },
      ],
    })
  })
})
