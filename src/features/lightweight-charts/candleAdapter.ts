import type {
  CandlestickData,
  Logical,
  LogicalRange,
  UTCTimestamp,
} from 'lightweight-charts'
import type { Candle } from '../../domain/candles/types'

export function toLightweightCandle(
  candle: Candle,
): CandlestickData<UTCTimestamp> {
  return {
    time: Math.floor(candle.timestamp / 1_000) as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }
}

export function toLightweightCandles(
  candles: readonly Candle[],
): CandlestickData<UTCTimestamp>[] {
  return candles.map(toLightweightCandle)
}

export function createVisibleLogicalRange(
  candleCount: number,
  visibleCount: number,
): LogicalRange | null {
  if (candleCount <= 0) {
    return null
  }

  const safeVisibleCount = Math.max(1, visibleCount)

  return {
    from: Math.max(0, candleCount - safeVisibleCount) as Logical,
    to: (candleCount - 0.5) as Logical,
  }
}
