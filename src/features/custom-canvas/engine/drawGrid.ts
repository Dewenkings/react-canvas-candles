import type { ChartScales, PlotRect, PriceRange } from './types'

export interface DrawGridInput {
  context: CanvasRenderingContext2D
  plotRect: PlotRect
  priceRange: PriceRange
  scales: ChartScales
}

export function drawGrid(input: DrawGridInput): void {
  const { context, plotRect, priceRange, scales } = input
  const horizontalLineCount = 5
  const verticalLineCount = 6

  context.save()
  context.strokeStyle = '#253047'
  context.lineWidth = 1
  context.beginPath()

  for (let index = 0; index < horizontalLineCount; index += 1) {
    const ratio = index / (horizontalLineCount - 1)
    const y = plotRect.top + ratio * plotRect.height
    context.moveTo(plotRect.left, y)
    context.lineTo(plotRect.left + plotRect.width, y)
  }

  for (let index = 0; index < verticalLineCount; index += 1) {
    const ratio = index / (verticalLineCount - 1)
    const x = plotRect.left + ratio * plotRect.width
    context.moveTo(x, plotRect.top)
    context.lineTo(x, plotRect.top + plotRect.height)
  }

  context.stroke()

  context.fillStyle = '#94a3b8'
  context.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'left'
  context.textBaseline = 'middle'

  for (let index = 0; index < horizontalLineCount; index += 1) {
    const ratio = index / (horizontalLineCount - 1)
    const price = priceRange.max - ratio * (priceRange.max - priceRange.min)
    const y = scales.toY(price)
    context.fillText(
      price.toFixed(2),
      plotRect.left + plotRect.width + 8,
      y,
    )
  }

  context.restore()
}
