import type { Candle } from '../../../domain/candles/types'
import { drawCandles } from './drawCandles'
import { drawGrid } from './drawGrid'
import { calculatePriceRange } from './priceRange'
import { createChartScales } from './scales'
import type { PlotRect } from './types'
import { getVisibleCandles } from './visibleCandles'

const INSETS = {
  top: 20,
  right: 64,
  bottom: 28,
  left: 12,
}

export interface DrawFrameInput {
  context: CanvasRenderingContext2D
  candles: readonly Candle[]
  width: number
  height: number
}

export function drawFrame({
  context,
  candles,
  width,
  height,
}: DrawFrameInput): void {
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#111827'
  context.fillRect(0, 0, width, height)

  const visibleCandles = getVisibleCandles(candles, 80)
  const priceRange = calculatePriceRange(visibleCandles)

  if (!priceRange) {
    context.fillStyle = '#94a3b8'
    context.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('No candle data', width / 2, height / 2)
    return
  }

  const plotRect: PlotRect = {
    left: INSETS.left,
    top: INSETS.top,
    width: Math.max(0, width - INSETS.left - INSETS.right),
    height: Math.max(0, height - INSETS.top - INSETS.bottom),
  }

  if (plotRect.width === 0 || plotRect.height === 0) {
    return
  }

  const scales = createChartScales({
    candleCount: visibleCandles.length,
    priceRange,
    plotRect,
  })

  drawGrid({ context, plotRect, priceRange, scales })
  drawCandles({ context, candles: visibleCandles, scales })
}
