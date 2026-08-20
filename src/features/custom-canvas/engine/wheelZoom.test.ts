import { describe, expect, it } from 'vitest'
import { getWheelZoomFactor } from './wheelZoom'

describe('getWheelZoomFactor', () => {
  it('normalizes line and page wheel deltas before calculating zoom', () => {
    expect(getWheelZoomFactor(-3, 1, 400)).toBeCloseTo(
      Math.exp(0.096),
    )
    expect(getWheelZoomFactor(-1, 2, 400)).toBeCloseTo(
      Math.exp(0.8),
    )
  })

  it('bounds extreme wheel events to one exponential step', () => {
    expect(getWheelZoomFactor(-10_000, 0, 400)).toBe(
      Math.exp(1),
    )
    expect(getWheelZoomFactor(10_000, 0, 400)).toBe(
      Math.exp(-1),
    )
  })
})
