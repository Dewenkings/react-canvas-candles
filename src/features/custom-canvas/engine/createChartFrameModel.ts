import type { Candle } from '../../../domain/candles/types'
import type { ChartFrameModel } from './types'
import { calculatePriceRange } from './priceRange'
import { createChartScales } from './scales'
import { getVisibleCandles } from './visibleCandles'

const INSETS = {
  top: 20,
  right: 64,
  bottom: 28,
  left: 12,
}

export interface CreateChartFrameModelInput {
  candles: readonly Candle[]
  visibleCount: number
  width: number
  height: number
}

export function createChartFrameModel(
  { candles, visibleCount, width, height }: CreateChartFrameModelInput,
): ChartFrameModel | null {
  const visibleCandles = getVisibleCandles(candles, visibleCount)
  const priceRange = calculatePriceRange(visibleCandles)
  const plotRect = {
    left: INSETS.left,
    top: INSETS.top,
    width: Math.max(0, width - INSETS.left - INSETS.right),
    height: Math.max(0, height - INSETS.top - INSETS.bottom),
  }

  if (!priceRange || plotRect.width === 0 || plotRect.height === 0) {
    return null
  }

  return {
    visibleCandles,
    priceRange,
    plotRect,
    scales: createChartScales({
      candleCount: visibleCandles.length,
      priceRange,
      plotRect,
    }),
  }
}
