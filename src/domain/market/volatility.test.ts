import { describe, expect, it } from 'vitest'
import {
  calculatePriceChangeRatio,
  VOLATILITY_PROFILES,
} from './volatility'

describe('calculatePriceChangeRatio', () => {
  it('keeps calm changes smaller than normal changes', () => {
    expect(calculatePriceChangeRatio('calm', 1, 1)).toBeCloseTo(0.0004)
    expect(calculatePriceChangeRatio('normal', 1, 1)).toBeCloseTo(0.002)
  })

  it('applies the spiky multiplier only below the spike threshold', () => {
    expect(calculatePriceChangeRatio('spiky', 1, 0.07)).toBeCloseTo(0.01)
    expect(calculatePriceChangeRatio('spiky', 1, 0.08)).toBeCloseTo(0.002)
  })

  it('supports negative price movements', () => {
    expect(calculatePriceChangeRatio('normal', 0, 1)).toBeCloseTo(-0.002)
  })

  it('gives chaos a larger base amplitude and spike chance than normal', () => {
    expect(VOLATILITY_PROFILES.chaos.baseAmplitude).toBeGreaterThan(
      VOLATILITY_PROFILES.normal.baseAmplitude,
    )
    expect(VOLATILITY_PROFILES.chaos.spikeChance).toBeGreaterThan(
      VOLATILITY_PROFILES.normal.spikeChance,
    )
  })
})
