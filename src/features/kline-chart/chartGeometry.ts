import type { Period } from 'klinecharts'

export function toKLinePeriod(candleIntervalMs: number): Period {
  const span = candleIntervalMs / 1_000

  if (!Number.isInteger(span) || span <= 0) {
    throw new Error(
      'KLineChart period must be a positive whole number of seconds',
    )
  }

  return {
    type: 'second',
    span,
  }
}

export function calculateBarSpace(
  containerWidth: number,
  visibleCount: number,
): number | null {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return null
  }

  const safeVisibleCount = Math.max(1, visibleCount)
  const barSpace = containerWidth / safeVisibleCount

  return Math.min(50, Math.max(1, barSpace))
}
