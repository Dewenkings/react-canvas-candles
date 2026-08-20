import type { BarSeriesOption, CandlestickSeriesOption } from 'echarts/charts'
import type {
  AxisPointerComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import type { ComposeOption } from 'echarts/core'
import type { Candle } from '../../domain/candles/types'
import { toEChartsMarketData } from './echartsAdapter'
import { getEChartsZoomRange } from './echartsZoom'

export type EChartsOption = ComposeOption<
  | AxisPointerComponentOption
  | BarSeriesOption
  | CandlestickSeriesOption
  | DataZoomComponentOption
  | GridComponentOption
  | TooltipComponentOption
>

export function formatEChartsTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

export interface EChartsTooltipDatum {
  axisValue?: string | number
  marker?: string
  seriesType?: string
  value?: unknown
}

export interface EChartsAxisPointerLabelParams {
  axisDimension?: string
  value?: unknown
}

export function formatEChartsAxisPointerLabel(
  params: EChartsAxisPointerLabelParams,
): string {
  if (params.axisDimension === 'x') {
    return formatEChartsTime(Number(params.value))
  }

  return String(params.value ?? '')
}

function formatPrice(value: unknown): string {
  const price = Number(value)

  return Number.isFinite(price) ? price.toFixed(4) : '—'
}

export function formatEChartsTooltip(
  params: EChartsTooltipDatum | readonly EChartsTooltipDatum[],
): string {
  const items = Array.isArray(params) ? params : [params]

  if (items.length === 0) {
    return ''
  }

  const timestamp = Number(items[0].axisValue)
  const rows = items.map((item) => {
    const marker = item.marker ?? ''

    if (
      item.seriesType === 'candlestick' &&
      Array.isArray(item.value)
    ) {
      const [open, close, low, high] = item.value

      return `${marker}开 ${formatPrice(open)} · 收 ${formatPrice(close)} · 低 ${formatPrice(low)} · 高 ${formatPrice(high)}`
    }

    return `${marker}Volume ${String(item.value ?? '—')}`
  })

  return [formatEChartsTime(timestamp), ...rows].join('<br/>')
}

export function createEChartsOption(
  candles: readonly Candle[],
  visibleCount: number,
): EChartsOption {
  const data = toEChartsMarketData(candles)
  const zoomRange = getEChartsZoomRange(
    candles.length,
    visibleCount,
  )

  return {
    animation: false,
    backgroundColor: '#111827',
    textStyle: {
      color: '#94a3b8',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        formatEChartsTooltip(
          params as EChartsTooltipDatum | EChartsTooltipDatum[],
        ),
      axisPointer: {
        type: 'cross',
      },
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: '#334155',
      textStyle: {
        color: '#e2e8f0',
      },
    },
    axisPointer: {
      link: [{ xAxisIndex: [0, 1] }],
      label: {
        backgroundColor: '#334155',
        formatter: formatEChartsAxisPointerLabel,
      },
    },
    grid: [
      {
        left: 64,
        right: 72,
        top: 36,
        height: 300,
      },
      {
        left: 64,
        right: 72,
        top: 370,
        height: 72,
      },
    ],
    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        data: data.timestamps,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: '#1e293b' } },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'category',
        gridIndex: 1,
        data: data.timestamps,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#94a3b8',
          formatter: (value: string) => formatEChartsTime(Number(value)),
        },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
    ],
    yAxis: [
      {
        scale: true,
        position: 'right',
        gridIndex: 0,
        splitArea: { show: false },
        axisLine: { show: true, lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#263349' } },
      },
      {
        scale: true,
        position: 'right',
        gridIndex: 1,
        axisLine: { show: true, lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#263349' } },
      },
    ],
    dataZoom: [
      {
        id: 'inside',
        type: 'inside',
        xAxisIndex: [0, 1],
        startValue: zoomRange.startValue,
        endValue: zoomRange.endValue,
      },
      {
        id: 'slider',
        type: 'slider',
        xAxisIndex: [0, 1],
        startValue: zoomRange.startValue,
        endValue: zoomRange.endValue,
        bottom: 4,
        height: 22,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
        fillerColor: 'rgba(56, 189, 248, 0.16)',
        dataBackground: {
          lineStyle: { color: '#64748b' },
          areaStyle: { color: '#334155' },
        },
        selectedDataBackground: {
          lineStyle: { color: '#38bdf8' },
          areaStyle: { color: '#0ea5e9' },
        },
        textStyle: { color: '#94a3b8' },
      },
    ],
    series: [
      {
        id: 'candles',
        name: 'OHLC',
        type: 'candlestick',
        data: data.candleValues,
        itemStyle: {
          color: '#22c55e',
          color0: '#ef4444',
          borderColor: '#22c55e',
          borderColor0: '#ef4444',
        },
      },
      {
        id: 'volume',
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: data.volumeValues,
        barMaxWidth: 12,
      },
    ],
  }
}

export function createEChartsDataUpdate(
  candles: readonly Candle[],
): EChartsOption {
  const data = toEChartsMarketData(candles)

  return {
    xAxis: [
      { data: data.timestamps },
      { data: data.timestamps },
    ],
    series: [
      {
        id: 'candles',
        type: 'candlestick',
        data: data.candleValues,
      },
      {
        id: 'volume',
        type: 'bar',
        data: data.volumeValues,
      },
    ],
  }
}

export function createEChartsZoomUpdate(
  dataLength: number,
  visibleCount: number,
): EChartsOption {
  const zoomRange = getEChartsZoomRange(dataLength, visibleCount)

  return {
    dataZoom: [
      {
        id: 'inside',
        startValue: zoomRange.startValue,
        endValue: zoomRange.endValue,
      },
      {
        id: 'slider',
        startValue: zoomRange.startValue,
        endValue: zoomRange.endValue,
      },
    ],
  }
}
