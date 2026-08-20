import { useRef } from 'react'
import type { Candle } from '../../domain/candles/types'
import { useDualCanvasRenderer } from './hooks/useDualCanvasRenderer'
import './customCanvas.css'

export interface CustomCanvasChartProps {
  candles: readonly Candle[]
  visibleCount: number
}

export function CustomCanvasChart({
  candles,
  visibleCount,
}: CustomCanvasChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useDualCanvasRenderer(
    containerRef,
    baseCanvasRef,
    overlayCanvasRef,
    candles,
    visibleCount,
  )

  return (
    <div
      ref={containerRef}
      className="custom-canvas-frame"
      role="img"
      aria-label="Custom candlestick chart learning canvas"
    >
      <canvas
        ref={baseCanvasRef}
        className="custom-canvas custom-canvas-base"
        aria-hidden="true"
      />
      <canvas
        ref={overlayCanvasRef}
        className="custom-canvas custom-canvas-overlay"
        aria-hidden="true"
      />
      <span className="chart-canvas-description">
        可交互的实时 K 线图，包含价格轴、时间轴和十字线。
      </span>
    </div>
  )
}
