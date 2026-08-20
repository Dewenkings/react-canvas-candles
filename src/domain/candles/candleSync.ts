import type { Candle } from './types'

export type CandleSyncMode = 'none' | 'replace' | 'update'

function candlesEqual(left: Candle, right: Candle): boolean {
  return (
    left.timestamp === right.timestamp &&
    left.open === right.open &&
    left.high === right.high &&
    left.low === right.low &&
    left.close === right.close &&
    left.volume === right.volume
  )
}

export function getCandleSyncMode(
  previousCandles: readonly Candle[] | null,
  nextCandles: readonly Candle[],
): CandleSyncMode {
  if (!previousCandles || nextCandles.length === 0) {
    return 'replace'
  }

  const lengthChange = nextCandles.length - previousCandles.length

  if (lengthChange < 0 || lengthChange > 1) {
    return 'replace'
  }

  const stablePrefixLength =
    lengthChange === 1 ? previousCandles.length : nextCandles.length - 1

  for (let index = 0; index < stablePrefixLength; index += 1) {
    if (!candlesEqual(previousCandles[index], nextCandles[index])) {
      return 'replace'
    }
  }

  if (lengthChange === 1) {
    return 'update'
  }

  const previousLast = previousCandles.at(-1)
  const nextLast = nextCandles.at(-1)

  if (!previousLast || !nextLast) {
    return 'replace'
  }

  return candlesEqual(previousLast, nextLast) ? 'none' : 'update'
}
