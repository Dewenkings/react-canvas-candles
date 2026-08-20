import type { Candle } from '../../../domain/candles/types'
import type { ChartFrameModel } from './types'
import type { TimeScaleState } from './timeScale'
import { calculatePriceRange } from './priceRange'
import { createChartScales } from './scales'
import { getVisibleLogicalRange } from './timeScale'

const INSETS = {
  top: 20,
  right: 64,
  bottom: 28,
  left: 12,
}

export interface CreateChartFrameModelInput {
  candles: readonly Candle[]
  timeScale: TimeScaleState
  width: number
  height: number
}

export function getChartPlotRect(width: number, height: number) {
  return {
    left: INSETS.left,
    top: INSETS.top,
    width: Math.max(0, width - INSETS.left - INSETS.right),
    height: Math.max(0, height - INSETS.top - INSETS.bottom),
  }
}

export function createChartFrameModel(
  { candles, timeScale, width, height }: CreateChartFrameModelInput,
): ChartFrameModel | null {
  const plotRect = getChartPlotRect(width, height)

  if (plotRect.width === 0 || plotRect.height === 0) {
    return null
  }

  const logicalRange = getVisibleLogicalRange({
    dataLength: candles.length,
    plotWidth: plotRect.width,
    state: timeScale,
  })
  const visibleCandles = candles.slice(logicalRange.from, logicalRange.to)
  const priceRange = calculatePriceRange(visibleCandles)

  if (!priceRange) {
    return null
  }

  const firstCandleX =
    plotRect.left +
    plotRect.width -
    (logicalRange.logicalTo - logicalRange.from) * timeScale.barSpacing

  return {
    visibleCandles,
    latestVisibleCandle:
      logicalRange.to === candles.length ? candles.at(-1) ?? null : null,
    priceRange,
    plotRect,
    scales: createChartScales({
      candleCount: visibleCandles.length,
      priceRange,
      plotRect,
      candleStep: timeScale.barSpacing,
      firstCandleX,
    }),
  }
}
