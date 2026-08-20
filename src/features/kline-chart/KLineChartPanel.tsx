import { useRef } from 'react'
import type { Candle } from '../../domain/candles/types'
import { useKLineChart } from './useKLineChart'
import './klineChart.css'

export interface KLineChartPanelProps {
  candles: readonly Candle[]
  visibleCount: number
  candleIntervalMs: number
}

export function KLineChartPanel({
  candles,
  visibleCount,
  candleIntervalMs,
}: KLineChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useKLineChart(
    containerRef,
    candles,
    visibleCount,
    candleIntervalMs,
  )

  return (
    <div
      ref={containerRef}
      className="kline-chart-host"
      role="region"
      aria-label="KLineChart 实时 K 线图，包含 MA 和成交量指标"
    />
  )
}
