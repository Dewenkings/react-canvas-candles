import type { KLineData } from 'klinecharts'
import type { Candle } from '../../domain/candles/types'

export function toKLineData(candle: Candle): KLineData {
  return {
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }
}

export function toKLineDataList(
  candles: readonly Candle[],
): KLineData[] {
  return candles.map(toKLineData)
}
