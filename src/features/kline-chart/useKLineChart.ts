import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { dispose, init } from 'klinecharts'
import type { Chart, KLineData } from 'klinecharts'
import { getCandleSyncMode } from '../../domain/candles/candleSync'
import type { Candle } from '../../domain/candles/types'
import { calculateBarSpace, toKLinePeriod } from './chartGeometry'
import { toKLineData, toKLineDataList } from './klineAdapter'

type RealtimeBarCallback = (data: KLineData) => void

export function useKLineChart(
  containerRef: RefObject<HTMLDivElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
  candleIntervalMs: number,
): void {
  const chartRef = useRef<Chart | null>(null)
  const candlesRef = useRef(candles)
  const visibleCountRef = useRef(visibleCount)
  const previousCandlesRef = useRef<readonly Candle[] | null>(null)
  const realtimeBarCallbackRef = useRef<RealtimeBarCallback | null>(null)

  useEffect(() => {
    candlesRef.current = candles
  }, [candles])

  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
    const chart = init(container, {
      locale: 'zh-CN',
      timezone,
      zoomAnchor: 'last_bar',
      layout: {
        barSpaceLimit: {
          min: 1,
          max: 50,
        },
        yAxis: {
          position: 'right',
          inside: false,
          scrollZoomEnabled: true,
          gap: {
            top: 0.2,
            bottom: 0.1,
          },
        },
      },
      styles: {
        grid: {
          horizontal: { color: '#263349' },
          vertical: { color: '#1e293b' },
        },
        candle: {
          bar: {
            upColor: '#22c55e',
            downColor: '#ef4444',
            noChangeColor: '#94a3b8',
            upBorderColor: '#22c55e',
            downBorderColor: '#ef4444',
            noChangeBorderColor: '#94a3b8',
            upWickColor: '#22c55e',
            downWickColor: '#ef4444',
            noChangeWickColor: '#94a3b8',
          },
        },
        xAxis: {
          axisLine: { color: '#334155' },
          tickLine: { color: '#334155' },
          tickText: { color: '#94a3b8' },
        },
        yAxis: {
          axisLine: { color: '#334155' },
          tickLine: { color: '#334155' },
          tickText: { color: '#94a3b8' },
        },
        separator: {
          color: '#334155',
          activeBackgroundColor: '#475569',
        },
      },
    })

    if (!chart) {
      throw new Error('KLineChart failed to initialize')
    }

    chartRef.current = chart
    chart.setSymbol({
      ticker: 'SIMULATED',
      pricePrecision: 4,
      volumePrecision: 0,
    })
    chart.setPeriod(toKLinePeriod(candleIntervalMs))
    chart.setDataLoader({
      getBars: ({ type, callback }) => {
        if (type === 'init' || type === 'update') {
          const currentCandles = candlesRef.current
          callback(toKLineDataList(currentCandles), false)
          previousCandlesRef.current = currentCandles
          return
        }

        callback([], false)
      },
      subscribeBar: ({ callback }) => {
        realtimeBarCallbackRef.current = callback
      },
      unsubscribeBar: () => {
        realtimeBarCallbackRef.current = null
      },
    })
    chart.createIndicator(
      { name: 'MA', paneId: 'candle_pane' },
      true,
    )
    chart.createIndicator('VOL')

    const updateBarSpace = () => {
      const barSpace = calculateBarSpace(
        container.clientWidth,
        visibleCountRef.current,
      )

      if (barSpace === null) {
        return
      }

      chart.setBarSpace(barSpace)
    }
    const resizeObserver = new ResizeObserver(updateBarSpace)

    resizeObserver.observe(container)
    updateBarSpace()

    return () => {
      resizeObserver.disconnect()
      realtimeBarCallbackRef.current = null
      previousCandlesRef.current = null
      chartRef.current = null
      dispose(chart)
    }
  }, [candleIntervalMs, containerRef])

  useEffect(() => {
    const chart = chartRef.current

    if (!chart) {
      return
    }

    const previousCandles = previousCandlesRef.current
    const syncMode = getCandleSyncMode(previousCandles, candles)

    if (syncMode === 'none') {
      return
    }

    if (syncMode === 'replace') {
      chart.resetData()
      return
    }

    const latestCandle = candles.at(-1)
    const realtimeBarCallback = realtimeBarCallbackRef.current

    if (!latestCandle || !realtimeBarCallback) {
      chart.resetData()
      return
    }

    realtimeBarCallback(toKLineData(latestCandle))

    if (
      previousCandles &&
      candles.length === previousCandles.length + 1
    ) {
      chart.scrollToRealTime()
    }

    previousCandlesRef.current = candles
  }, [candles])

  useEffect(() => {
    const chart = chartRef.current
    const container = containerRef.current

    if (!chart || !container) {
      return
    }

    const barSpace = calculateBarSpace(
      container.clientWidth,
      visibleCount,
    )

    if (barSpace !== null) {
      chart.setBarSpace(barSpace)
    }
  }, [containerRef, visibleCount])
}
