import { useRef } from 'react'
import type { Candle } from '../../domain/candles/types'
import { useLightweightChart } from './useLightweightChart'
import './lightweightChart.css'

export interface LightweightChartProps {
  candles: readonly Candle[]
  visibleCount: number
}

export function LightweightChart({
  candles,
  visibleCount,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useLightweightChart(containerRef, candles, visibleCount)

  return (
    <div className="lightweight-chart-frame">
      <div
        ref={containerRef}
        className="lightweight-chart-host"
        role="img"
        aria-label="Lightweight Charts 实时 K 线图"
      />
      <p className="lightweight-attribution">
        Powered by{' '}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
        >
          TradingView Lightweight Charts™
        </a>
      </p>
    </div>
  )
}
