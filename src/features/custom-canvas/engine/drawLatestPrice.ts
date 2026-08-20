import type { Candle } from '../../../domain/candles/types'
import type { ChartScales, PlotRect } from './types'

export interface DrawLatestPriceInput {
  context: CanvasRenderingContext2D
  candles: readonly Candle[]
  plotRect: PlotRect
  scales: ChartScales
}

export function drawLatestPrice({
  context,
  candles,
  plotRect,
  scales,
}: DrawLatestPriceInput): void {
  const latest = candles.at(-1)

  if (!latest) {
    return
  }

  const y = scales.toY(latest.close)
  const color = latest.close >= latest.open ? '#22c55e' : '#ef4444'
  const plotRight = plotRect.left + plotRect.width
  const labelHeight = 22

  context.save()
  context.strokeStyle = color
  context.lineWidth = 1
  context.setLineDash([5, 4])
  context.beginPath()
  context.moveTo(plotRect.left, y)
  context.lineTo(plotRight, y)
  context.stroke()
  context.setLineDash([])

  context.fillStyle = color
  context.fillRect(plotRight, y - labelHeight / 2, 64, labelHeight)
  context.fillStyle = '#071018'
  context.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(latest.close.toFixed(2), plotRight + 7, y)
  context.restore()
}
