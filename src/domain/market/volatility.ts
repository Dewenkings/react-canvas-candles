export type VolatilityMode = 'calm' | 'normal' | 'spiky' | 'chaos'

export interface VolatilityProfile {
  baseAmplitude: number
  spikeChance: number
  spikeMultiplier: number
}

export const VOLATILITY_PROFILES: Record<
  VolatilityMode,
  VolatilityProfile
> = {
  calm: { baseAmplitude: 0.0008, spikeChance: 0, spikeMultiplier: 1 },
  normal: { baseAmplitude: 0.004, spikeChance: 0, spikeMultiplier: 1 },
  spiky: { baseAmplitude: 0.004, spikeChance: 0.08, spikeMultiplier: 5 },
  chaos: { baseAmplitude: 0.015, spikeChance: 0.2, spikeMultiplier: 3 },
}

export function calculatePriceChangeRatio(
  mode: VolatilityMode,
  directionRandom: number,
  spikeRandom: number,
): number {
  const profile = VOLATILITY_PROFILES[mode]
  const multiplier =
    spikeRandom < profile.spikeChance ? profile.spikeMultiplier : 1

  return (directionRandom - 0.5) * profile.baseAmplitude * multiplier
}
