import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { BarChart, CandlestickChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import type { ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { Candle } from '../../domain/candles/types'
import {
  createEChartsDataUpdate,
  createEChartsOption,
  createEChartsZoomUpdate,
} from './echartsOption'

echarts.use([
  AxisPointerComponent,
  BarChart,
  CandlestickChart,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
])

export function useECharts(
  containerRef: RefObject<HTMLDivElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
): void {
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const chart = echarts.init(container, undefined, {
      renderer: 'canvas',
    })
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) {
        return
      }

      chart.resize()
    })

    chartRef.current = chart
    chart.setOption(createEChartsOption([], 1))
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chartRef.current = null
      chart.dispose()
    }
  }, [containerRef])

  useEffect(() => {
    const chart = chartRef.current

    if (!chart) {
      return
    }

    chart.setOption(createEChartsDataUpdate(candles), {
      lazyUpdate: true,
    })
  }, [candles])

  useEffect(() => {
    const chart = chartRef.current

    if (!chart) {
      return
    }

    chart.setOption(
      createEChartsZoomUpdate(candles.length, visibleCount),
    )
  }, [candles.length, visibleCount])
}
