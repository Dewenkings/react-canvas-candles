import { describe, expect, it } from 'vitest'
import { createChartScales } from './scales'

const input = {
  candleCount: 4,
  priceRange: { min: 90, max: 110 },
  plotRect: { left: 10, top: 20, width: 200, height: 100 },
}

describe('createChartScales', () => {
  it('maps candle indexes to the centers of equal horizontal slots', () => {
    const scales = createChartScales(input)

    expect(scales.candleStep).toBe(50)
    expect(scales.toX(0)).toBe(35)
    expect(scales.toX(3)).toBe(185)
  })

  it('uses 65 percent of a slot for candle body width', () => {
    expect(createChartScales(input).candleBodyWidth).toBe(32.5)
  })

  it('keeps candle body width at least one CSS pixel', () => {
    const scales = createChartScales({
      ...input,
      candleCount: 10,
      plotRect: { ...input.plotRect, width: 1 },
    })

    expect(scales.candleBodyWidth).toBe(1)
  })

  it('maps maximum, minimum, and midpoint prices to inverted Y positions', () => {
    const scales = createChartScales(input)

    expect(scales.toY(110)).toBe(20)
    expect(scales.toY(100)).toBe(70)
    expect(scales.toY(90)).toBe(120)
  })

  it('maps plot Y positions back to prices', () => {
    const scales = createChartScales(input)

    expect(scales.toPrice(20)).toBe(110)
    expect(scales.toPrice(70)).toBe(100)
    expect(scales.toPrice(120)).toBe(90)
  })

  it('maps X positions to the nearest candle index', () => {
    const scales = createChartScales(input)

    expect(scales.toIndex(35)).toBe(0)
    expect(scales.toIndex(185)).toBe(3)
  })

  it('clamps X positions outside the plot to a valid candle index', () => {
    const scales = createChartScales(input)

    expect(scales.toIndex(-100)).toBe(0)
    expect(scales.toIndex(900)).toBe(3)
  })

  it('uses viewport-provided candle spacing and first-candle position', () => {
    const scales = createChartScales({
      ...input,
      candleStep: 100,
      firstCandleX: 30,
    })

    expect(scales.toX(0)).toBe(30)
    expect(scales.toX(1)).toBe(130)
    expect(scales.toIndex(125)).toBe(1)
  })
})
