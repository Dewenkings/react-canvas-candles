import type { Candle } from '../../../domain/candles/types'
import type { ChartScales, PlotRect, PointerState } from './types'

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export interface DrawCrosshairInput {
  context: CanvasRenderingContext2D
  candles: readonly Candle[]
  plotRect: PlotRect
  scales: ChartScales
  pointer: PointerState
}

export function drawCrosshair({
  context,
  candles,
  plotRect,
  scales,
  pointer,
}: DrawCrosshairInput): void {
  const plotRight = plotRect.left + plotRect.width
  const plotBottom = plotRect.top + plotRect.height
  const isInPlot =
    pointer.isInside &&
    pointer.x >= plotRect.left &&
    pointer.x <= plotRight &&
    pointer.y >= plotRect.top &&
    pointer.y <= plotBottom

  if (!isInPlot || candles.length === 0) {
    return
  }

  const candleIndex = scales.toIndex(pointer.x)
  const candle = candles[candleIndex]

  if (!candle) {
    return
  }

  const snappedX = scales.toX(candleIndex)
  const pointerPrice = scales.toPrice(pointer.y)
  const timeLabel = timeFormatter.format(candle.timestamp)
  const axisLabelHeight = 22
  const timeLabelWidth = Math.min(84, plotRect.width)
  const timeLabelX = Math.min(
    plotRight - timeLabelWidth,
    Math.max(plotRect.left, snappedX - timeLabelWidth / 2),
  )

  context.save()
  context.strokeStyle = '#94a3b8'
  context.lineWidth = 1
  context.setLineDash([4, 4])
  context.beginPath()
  context.moveTo(snappedX, plotRect.top)
  context.lineTo(snappedX, plotBottom)
  context.moveTo(plotRect.left, pointer.y)
  context.lineTo(plotRight, pointer.y)
  context.stroke()
  context.setLineDash([])

  context.fillStyle = '#cbd5e1'
  context.fillRect(
    plotRight,
    pointer.y - axisLabelHeight / 2,
    64,
    axisLabelHeight,
  )
  context.fillStyle = '#0f172a'
  context.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(pointerPrice.toFixed(2), plotRight + 7, pointer.y)

  context.fillStyle = '#cbd5e1'
  context.fillRect(timeLabelX, plotBottom, timeLabelWidth, 24)
  context.fillStyle = '#0f172a'
  context.textAlign = 'center'
  context.fillText(timeLabel, timeLabelX + timeLabelWidth / 2, plotBottom + 12)

  const panelX = plotRect.left + 10
  const panelY = plotRect.top + 10
  const panelWidth = Math.min(390, Math.max(180, plotRect.width - 20))
  context.fillStyle = 'rgb(15 23 42 / 88%)'
  context.fillRect(panelX, panelY, panelWidth, 48)
  context.strokeStyle = '#334155'
  context.strokeRect(panelX, panelY, panelWidth, 48)

  context.fillStyle = '#94a3b8'
  context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(
    `${timeLabel}  V ${candle.volume}`,
    panelX + 9,
    panelY + 14,
    panelWidth - 18,
  )
  context.fillStyle = '#e2e8f0'
  context.fillText(
    `O ${candle.open.toFixed(4)}  H ${candle.high.toFixed(4)}  L ${candle.low.toFixed(4)}  C ${candle.close.toFixed(4)}`,
    panelX + 9,
    panelY + 34,
    panelWidth - 18,
  )
  context.restore()
}
