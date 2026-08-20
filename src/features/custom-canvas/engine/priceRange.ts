import type { Candle } from '../../../domain/candles/types'
import type { PriceRange } from './types'

export function calculatePriceRange(
  candles: readonly Candle[],
): PriceRange | null {
  if (candles.length === 0) {
    return null
  }

  let rawMin = Number.POSITIVE_INFINITY
  let rawMax = Number.NEGATIVE_INFINITY

  for (const candle of candles) {
    rawMin = Math.min(rawMin, candle.low)
    rawMax = Math.max(rawMax, candle.high)
  }

  const rawSpan = rawMax - rawMin
  const padding =
    rawSpan === 0 ? Math.max(Math.abs(rawMax) * 0.01, 1) : rawSpan * 0.05

  return {
    min: rawMin - padding,
    max: rawMax + padding,
  }
}
