import { describe, expect, it } from 'vitest'
import { getCandleCountForDuration } from './chartSettings'

describe('getCandleCountForDuration', () => {
  it('converts a time window into its candle count', () => {
    expect(getCandleCountForDuration(60_000, 5_000)).toBe(12)
  })

  it('rounds up when the duration contains a partial candle', () => {
    expect(getCandleCountForDuration(10_000, 3_000)).toBe(4)
  })

  it('keeps at least one candle visible', () => {
    expect(getCandleCountForDuration(1_000, 5_000)).toBe(1)
  })

  it('rejects a non-positive candle interval', () => {
    expect(() => getCandleCountForDuration(60_000, 0)).toThrow(RangeError)
  })
})
