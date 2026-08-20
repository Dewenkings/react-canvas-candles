import { describe, expect, it } from 'vitest'
import type { Candle } from '../../../domain/candles/types'
import { createChartScales } from './scales'
import { drawGrid } from './drawGrid'

describe('drawGrid', () => {
  it('labels each grid X coordinate with the nearest viewport candle', () => {
    const labels: Array<{ text: string; x: number; y: number }> = []
    const context = {
      save: () => undefined,
      restore: () => undefined,
      beginPath: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      stroke: () => undefined,
      fillText: (text: string, x: number, y: number) =>
        labels.push({ text, x, y }),
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set fillStyle(_value: string) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
      set textBaseline(_value: CanvasTextBaseline) {},
    } as unknown as CanvasRenderingContext2D
    const candles: Candle[] = [0, 60_000, 120_000].map(
      (timestamp, index) => ({
        timestamp,
        open: 100 + index,
        high: 102 + index,
        low: 99 + index,
        close: 101 + index,
        volume: 10,
      }),
    )
    const plotRect = { left: 10, top: 20, width: 200, height: 100 }
    const scales = createChartScales({
      candleCount: candles.length,
      priceRange: { min: 90, max: 110 },
      plotRect,
      candleStep: 100,
      firstCandleX: 30,
    })
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    drawGrid({
      context,
      plotRect,
      priceRange: { min: 90, max: 110 },
      scales,
      candles,
    })

    const timeLabels = labels.filter(({ y }) => y === 128)
    expect(timeLabels[4]?.text).toBe(formatter.format(candles[1].timestamp))
  })
})
