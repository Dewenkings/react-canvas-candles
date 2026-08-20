// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSimulatedFeed } from './useSimulatedFeed'

const options = {
  initialCount: 3,
  endTimestamp: 180_000,
  startPrice: 100,
  candleIntervalMs: 60_000,
  tickIntervalMs: 100,
  simulatedTickStepMs: 100,
  seed: 42,
  volatilityMode: 'normal' as const,
}

describe('useSimulatedFeed', () => {
  it('increments resetVersion even when reset keeps the same candle count', () => {
    const { result } = renderHook(() => useSimulatedFeed(options))

    expect(result.current.resetVersion).toBe(0)

    act(() => result.current.reset())

    expect(result.current.candles).toHaveLength(3)
    expect(result.current.resetVersion).toBe(1)
  })
})
