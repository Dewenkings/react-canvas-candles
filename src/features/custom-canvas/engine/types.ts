import type { Candle } from '../../../domain/candles/types'

export interface PriceRange {
  min: number
  max: number
}

export interface PlotRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ChartScales {
  toX: (index: number) => number
  toY: (price: number) => number
  toPrice: (y: number) => number
  toIndex: (x: number) => number
  candleStep: number
  candleBodyWidth: number
}

export interface PointerState {
  x: number
  y: number
  isInside: boolean
}

export interface CreateChartScalesInput {
  candleCount: number
  priceRange: PriceRange
  plotRect: PlotRect
  candleStep?: number
  firstCandleX?: number
}

export interface ChartFrameModel {
  visibleCandles: readonly Candle[]
  latestVisibleCandle: Candle | null
  priceRange: PriceRange
  plotRect: PlotRect
  scales: ChartScales
}
