import { useRef } from 'react'
import type { Candle } from '../../domain/candles/types'
import { useCanvasRenderer } from './hooks/useCanvasRenderer'
import './customCanvas.css'

export interface CustomCanvasChartProps {
  candles: readonly Candle[]
}

export function CustomCanvasChart({ candles }: CustomCanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useCanvasRenderer(canvasRef, candles)

  return (
    <div className="custom-canvas-frame">
      <canvas
        ref={canvasRef}
        className="custom-canvas"
        role="img"
        aria-label="Custom candlestick chart learning canvas"
      >
        当前浏览器不支持 Canvas。
      </canvas>
    </div>
  )
}
