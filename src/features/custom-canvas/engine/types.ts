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
  candleStep: number
  candleBodyWidth: number
}

export interface CreateChartScalesInput {
  candleCount: number
  priceRange: PriceRange
  plotRect: PlotRect
}
