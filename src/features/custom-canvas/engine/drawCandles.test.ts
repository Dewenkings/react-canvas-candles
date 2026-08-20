import { describe, expect, it } from 'vitest'
import { drawCandles } from './drawCandles'

describe('drawCandles', () => {
  it('clips candle painting to the plot rectangle before drawing bodies', () => {
    const operations: string[] = []
    const context = {
      save: () => operations.push('save'),
      restore: () => operations.push('restore'),
      beginPath: () => operations.push('beginPath'),
      rect: (x: number, y: number, width: number, height: number) =>
        operations.push(`rect:${x},${y},${width},${height}`),
      clip: () => operations.push('clip'),
      moveTo: () => operations.push('moveTo'),
      lineTo: () => operations.push('lineTo'),
      stroke: () => operations.push('stroke'),
      fillRect: () => operations.push('fillRect'),
      set lineWidth(_value: number) {},
      set strokeStyle(_value: string) {},
      set fillStyle(_value: string) {},
    } as unknown as CanvasRenderingContext2D

    drawCandles({
      context,
      candles: [
        {
          timestamp: 1_000,
          open: 100,
          high: 102,
          low: 99,
          close: 101,
          volume: 10,
        },
      ],
      plotRect: { left: 10, top: 20, width: 200, height: 100 },
      scales: {
        toX: () => 10,
        toY: (price) => price,
        toPrice: (y) => y,
        toIndex: () => 0,
        candleStep: 200,
        candleBodyWidth: 130,
      },
    })

    expect(operations).toContain('rect:10,20,200,100')
    expect(operations.indexOf('clip')).toBeLessThan(
      operations.indexOf('fillRect'),
    )
  })
})
