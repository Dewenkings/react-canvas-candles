import { describe, expect, it } from 'vitest'
import { calculateBarSpace, toKLinePeriod } from './chartGeometry'

describe('toKLinePeriod', () => {
  it.each([
    [1_000, 1],
    [2_000, 2],
    [5_000, 5],
    [10_000, 10],
  ])('maps %i milliseconds to a second period', (intervalMs, span) => {
    expect(toKLinePeriod(intervalMs)).toEqual({
      type: 'second',
      span,
    })
  })

  it.each([0, -1_000, 1_500])(
    'rejects an invalid interval of %i milliseconds',
    (intervalMs) => {
      expect(() => toKLinePeriod(intervalMs)).toThrow(
        'KLineChart period must be a positive whole number of seconds',
      )
    },
  )
})

describe('calculateBarSpace', () => {
  it('divides the available width by the visible candle count', () => {
    expect(calculateBarSpace(800, 80)).toBe(10)
  })

  it('clamps wide bars to the library maximum', () => {
    expect(calculateBarSpace(800, 1)).toBe(50)
  })

  it('clamps narrow bars to the library minimum', () => {
    expect(calculateBarSpace(10, 80)).toBe(1)
  })

  it.each([0, -1, Number.NaN])(
    'skips a transient non-renderable width of %s',
    (containerWidth) => {
      expect(calculateBarSpace(containerWidth, 80)).toBeNull()
    },
  )

  it('treats a non-positive visible count as one candle', () => {
    expect(calculateBarSpace(40, 0)).toBe(40)
  })
})
