import { drawCrosshair } from './drawCrosshair'
import type { ChartFrameModel, PointerState } from './types'

export interface DrawOverlayFrameInput {
  context: CanvasRenderingContext2D
  model: ChartFrameModel | null
  pointer: PointerState
  width: number
  height: number
}

export function drawOverlayFrame({
  context,
  model,
  pointer,
  width,
  height,
}: DrawOverlayFrameInput): void {
  context.clearRect(0, 0, width, height)

  if (!model) {
    return
  }

  drawCrosshair({
    context,
    candles: model.visibleCandles,
    plotRect: model.plotRect,
    scales: model.scales,
    pointer,
  })
}
