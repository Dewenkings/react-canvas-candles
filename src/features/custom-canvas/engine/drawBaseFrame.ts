import { drawCandles } from './drawCandles'
import { drawGrid } from './drawGrid'
import { drawLatestPrice } from './drawLatestPrice'
import type { ChartFrameModel } from './types'

export interface DrawBaseFrameInput {
  context: CanvasRenderingContext2D
  model: ChartFrameModel | null
  width: number
  height: number
}

export function drawBaseFrame({
  context,
  model,
  width,
  height,
}: DrawBaseFrameInput): void {
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#111827'
  context.fillRect(0, 0, width, height)

  if (!model) {
    context.fillStyle = '#94a3b8'
    context.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('No candle data', width / 2, height / 2)
    return
  }

  const {
    visibleCandles,
    latestVisibleCandle,
    priceRange,
    plotRect,
    scales,
  } = model

  drawGrid({
    context,
    plotRect,
    priceRange,
    scales,
    candles: visibleCandles,
  })
  drawCandles({
    context,
    candles: visibleCandles,
    plotRect,
    scales,
  })
  drawLatestPrice({
    context,
    latest: latestVisibleCandle,
    plotRect,
    scales,
  })
}
