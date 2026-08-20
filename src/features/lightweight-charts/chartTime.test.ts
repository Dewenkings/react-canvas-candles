import { describe, expect, it } from 'vitest'
import type { UTCTimestamp } from 'lightweight-charts'
import { createChartTimeFormatter } from './chartTime'

describe('createChartTimeFormatter', () => {
  it('formats a Unix timestamp in the requested local timezone', () => {
    const formatTime = createChartTimeFormatter('Asia/Shanghai')

    expect(formatTime(1_787_222_585 as UTCTimestamp)).toBe('18:43:05')
  })
})
