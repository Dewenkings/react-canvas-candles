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
})
