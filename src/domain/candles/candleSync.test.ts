import { describe, expect, it } from 'vitest'
import type { Candle } from './types'
import { getCandleSyncMode } from './candleSync'

const first: Candle = {
  timestamp: 1_000,
  open: 100,
  high: 102,
  low: 99,
  close: 101,
  volume: 10,
}

const second: Candle = {
  timestamp: 2_000,
  open: 101,
  high: 103,
  low: 100,
  close: 102,
  volume: 20,
}

describe('getCandleSyncMode', () => {
  it('replaces the series on its first snapshot', () => {
    expect(getCandleSyncMode(null, [first, second])).toBe('replace')
  })

  it('replaces existing data with an empty snapshot', () => {
    expect(getCandleSyncMode([first], [])).toBe('replace')
  })

  it('does nothing when every Candle value is unchanged', () => {
    expect(
      getCandleSyncMode(
        [first, second],
        [{ ...first }, { ...second }],
      ),
    ).toBe('none')
  })

  it('updates when only the latest Candle changes', () => {
    expect(
      getCandleSyncMode(
        [first, second],
        [first, { ...second, high: 104, close: 103 }],
      ),
    ).toBe('update')
  })

  it('updates when exactly one new final Candle is appended', () => {
    expect(getCandleSyncMode([first], [first, second])).toBe('update')
  })

  it('replaces when a reset shrinks the array', () => {
    expect(getCandleSyncMode([first, second], [first])).toBe('replace')
  })

  it('replaces when the first timestamp changes', () => {
    expect(
      getCandleSyncMode(
        [first, second],
        [{ ...first, timestamp: 500 }, second],
      ),
    ).toBe('replace')
  })

  it('replaces when an older Candle value changes', () => {
    expect(
      getCandleSyncMode(
        [first, second],
        [{ ...first, high: 120 }, second],
      ),
    ).toBe('replace')
  })

  it('replaces when more than one Candle is appended', () => {
    expect(
      getCandleSyncMode(
        [first],
        [
          first,
          second,
          { ...second, timestamp: 3_000 },
        ],
      ),
    ).toBe('replace')
  })
})
