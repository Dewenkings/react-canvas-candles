import type { Candle, GenerateCandlesOptions } from './types'

const MIN_PRICE = 0.01

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function generateCandles(
  options: GenerateCandlesOptions,
): Candle[] {
  const { count, endTimestamp, intervalMs, startPrice, seed } = options

  if (count <= 0) {
    return []
  }

  const random = createSeededRandom(seed)
  const alignedEndTimestamp =
    Math.floor(endTimestamp / intervalMs) * intervalMs
  const firstTimestamp = alignedEndTimestamp - (count - 1) * intervalMs
  const candles: Candle[] = []
  let previousClose = Math.max(MIN_PRICE, startPrice)

  for (let index = 0; index < count; index += 1) {
    const open = previousClose
    const priceChangeRatio = (random() - 0.5) * 0.02
    const close = Math.max(MIN_PRICE, open * (1 + priceChangeRatio))
    const bodyHigh = Math.max(open, close)
    const bodyLow = Math.min(open, close)
    const high = bodyHigh * (1 + random() * 0.005)
    const low = Math.max(MIN_PRICE, bodyLow * (1 - random() * 0.005))
    const volume = Math.floor(random() * 1_000)

    candles.push({
      timestamp: firstTimestamp + index * intervalMs,
      open,
      high,
      low,
      close,
      volume,
    })

    previousClose = close
  }

  return candles
}
