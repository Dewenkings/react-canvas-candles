import type { ChartScales, CreateChartScalesInput } from './types'

export function createChartScales(
  input: CreateChartScalesInput,
): ChartScales {
  const { candleCount, priceRange, plotRect } = input
  const candleStep = plotRect.width / candleCount
  const candleBodyWidth = Math.max(1, candleStep * 0.65)
  const priceSpan = priceRange.max - priceRange.min

  const toX = (index: number) =>
    plotRect.left + (index + 0.5) * candleStep

  const toY = (price: number) => {
    const priceRatio = (priceRange.max - price) / priceSpan
    return plotRect.top + priceRatio * plotRect.height
  }

  const toPrice = (y: number) => {
    const priceRatio = (y - plotRect.top) / plotRect.height
    return priceRange.max - priceRatio * priceSpan
  }

  const toIndex = (x: number) => {
    const rawIndex = Math.round(
      (x - plotRect.left) / candleStep - 0.5,
    )
    return Math.min(candleCount - 1, Math.max(0, rawIndex))
  }

  return {
    toX,
    toY,
    toPrice,
    toIndex,
    candleStep,
    candleBodyWidth,
  }
}
