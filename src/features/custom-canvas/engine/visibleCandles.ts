import type { Candle } from '../../../domain/candles/types'

export function getVisibleCandles(
  candles: readonly Candle[],
  maxVisible = 80,
): Candle[] {
  const visibleCount = Math.max(0, Math.floor(maxVisible))

  if (visibleCount === 0) {
    return []
  }

  return candles.slice(-visibleCount)
}
