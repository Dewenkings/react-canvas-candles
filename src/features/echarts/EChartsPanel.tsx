import { useRef } from 'react'
import type { Candle } from '../../domain/candles/types'
import { useECharts } from './useECharts'
import './echarts.css'

export interface EChartsPanelProps {
  candles: readonly Candle[]
  visibleCount: number
}

export function EChartsPanel({
  candles,
  visibleCount,
}: EChartsPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useECharts(containerRef, candles, visibleCount)

  return (
    <div
      ref={containerRef}
      className="echarts-host"
      role="region"
      aria-label="ECharts 实时 K 线图，包含成交量和数据缩放"
    />
  )
}
