import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
} from 'lightweight-charts'
import type {
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts'
import type { Candle } from '../../domain/candles/types'
import { getCandleSyncMode } from '../../domain/candles/candleSync'
import {
  createVisibleLogicalRange,
  toLightweightCandle,
  toLightweightCandles,
} from './candleAdapter'
import { createChartTimeFormatter } from './chartTime'

export function useLightweightChart(
  containerRef: RefObject<HTMLDivElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
): void {
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const previousCandlesRef = useRef<readonly Candle[] | null>(null)
  const previousVisibleCountRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const formatChartTime = createChartTimeFormatter()
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        attributionLogo: false,
        background: {
          type: ColorType.Solid,
          color: '#111827',
        },
        textColor: '#94a3b8',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#263349' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      localization: {
        timeFormatter: formatChartTime,
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 0.5,
        tickMarkFormatter: formatChartTime,
      },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineColor: '#f43f5e',
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      previousCandlesRef.current = null
      previousVisibleCountRef.current = null
    }
  }, [containerRef])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current

    if (!chart || !series) {
      return
    }

    const previousCandles = previousCandlesRef.current
    const syncMode = getCandleSyncMode(previousCandles, candles)
    const visibleCountChanged =
      previousVisibleCountRef.current !== visibleCount
    const appendedCandle =
      previousCandles !== null &&
      candles.length === previousCandles.length + 1

    if (syncMode === 'replace') {
      series.setData(toLightweightCandles(candles))
    } else if (syncMode === 'update') {
      const latestCandle = candles.at(-1)

      if (latestCandle) {
        series.update(toLightweightCandle(latestCandle))
      }
    }

    if (
      syncMode === 'replace' ||
      appendedCandle ||
      visibleCountChanged
    ) {
      const range = createVisibleLogicalRange(
        candles.length,
        visibleCount,
      )

      if (range) {
        chart.timeScale().setVisibleLogicalRange(range)
      }
    }

    previousCandlesRef.current = candles
    previousVisibleCountRef.current = visibleCount
  }, [candles, visibleCount])
}
