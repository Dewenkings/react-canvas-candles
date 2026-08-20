import type { Candle } from '../../domain/candles/types'

export type EChartsCandleValue = [
  open: number,
  close: number,
  low: number,
  high: number,
]

export interface EChartsVolumeValue {
  value: number
  itemStyle: {
    color: string
  }
}

export interface EChartsMarketData {
  timestamps: number[]
  candleValues: EChartsCandleValue[]
  volumeValues: EChartsVolumeValue[]
}

const UP_COLOR = '#22c55e'
const DOWN_COLOR = '#ef4444'

export function toEChartsMarketData(
  candles: readonly Candle[],
): EChartsMarketData {
  return {
    timestamps: candles.map((candle) => candle.timestamp),
    candleValues: candles.map((candle) => [
      candle.open,
      candle.close,
      candle.low,
      candle.high,
    ]),
    volumeValues: candles.map((candle) => ({
      value: candle.volume,
      itemStyle: {
        color: candle.close >= candle.open ? UP_COLOR : DOWN_COLOR,
      },
    })),
  }
}
