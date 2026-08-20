import type { Candle } from '../../../domain/candles/types'
import type { ChartScales } from './types'

export interface DrawCandlesInput {
  context: CanvasRenderingContext2D
  candles: readonly Candle[]
  scales: ChartScales
}

export function drawCandles(input: DrawCandlesInput): void {
  const { context, candles, scales } = input

  context.save()
  context.lineWidth = 1

  candles.forEach((candle, index) => {
    const x = scales.toX(index)
    const highY = scales.toY(candle.high)
    const lowY = scales.toY(candle.low)
    const openY = scales.toY(candle.open)
    const closeY = scales.toY(candle.close)
    const color = candle.close >= candle.open ? '#22c55e' : '#ef4444'

    context.strokeStyle = color
    context.beginPath()
    context.moveTo(x, highY)
    context.lineTo(x, lowY)
    context.stroke()

    const rawBodyHeight = Math.abs(closeY - openY)
    const bodyHeight = Math.max(1, rawBodyHeight)
    const bodyTop =
      rawBodyHeight < 1
        ? (openY + closeY) / 2 - bodyHeight / 2
        : Math.min(openY, closeY)

    context.fillStyle = color
    context.fillRect(
      x - scales.candleBodyWidth / 2,
      bodyTop,
      scales.candleBodyWidth,
      bodyHeight,
    )
  })

  context.restore()
}
