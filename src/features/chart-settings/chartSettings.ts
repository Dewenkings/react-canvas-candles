export function getCandleCountForDuration(
  durationMs: number,
  candleIntervalMs: number,
): number {
  if (!Number.isFinite(candleIntervalMs) || candleIntervalMs <= 0) {
    throw new RangeError('candleIntervalMs must be greater than zero')
  }

  return Math.max(1, Math.ceil(Math.max(0, durationMs) / candleIntervalMs))
}

export const CANDLE_INTERVAL_OPTIONS = [
  { label: '1s', value: 1_000 },
  { label: '2s', value: 2_000 },
  { label: '5s', value: 5_000 },
  { label: '10s', value: 10_000 },
] as const

export const TICK_INTERVAL_OPTIONS = [
  { label: '50ms', value: 50 },
  { label: '100ms', value: 100 },
  { label: '300ms', value: 300 },
  { label: '1s', value: 1_000 },
] as const

export const WINDOW_OPTIONS = [
  { label: '10s', value: 10_000 },
  { label: '30s', value: 30_000 },
  { label: '1m', value: 60_000 },
  { label: '5m', value: 300_000 },
] as const

export const VOLATILITY_OPTIONS: readonly {
  label: string
  value: VolatilityMode
}[] = [
  { label: 'Calm', value: 'calm' },
  { label: 'Normal', value: 'normal' },
  { label: 'Spiky', value: 'spiky' },
  { label: 'Chaos', value: 'chaos' },
]

export const MAX_WINDOW_MS = WINDOW_OPTIONS.at(-1)?.value ?? 300_000
import type { VolatilityMode } from '../../domain/market/volatility'
