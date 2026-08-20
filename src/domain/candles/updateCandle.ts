import type { Candle, PriceTick } from './types'

export function updateCandle(
  candles: Candle[],
  tick: PriceTick,
  intervalMs: number,
): Candle[] {
  const tickBucket = Math.floor(tick.timestamp / intervalMs) * intervalMs
  const lastCandle = candles.at(-1)

  if (!lastCandle) {
    return [
      {
        timestamp: tickBucket,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
      },
    ]
  }

  if (tickBucket < lastCandle.timestamp) {
    return candles
  }

  if (tickBucket === lastCandle.timestamp) {
    const updatedCandle: Candle = {
      ...lastCandle,
      high: Math.max(lastCandle.high, tick.price),
      low: Math.min(lastCandle.low, tick.price),
      close: tick.price,
      volume: lastCandle.volume + tick.volume,
    }

    return [...candles.slice(0, -1), updatedCandle]
  }

  const nextCandle: Candle = {
    timestamp: tickBucket,
    open: lastCandle.close,
    high: Math.max(lastCandle.close, tick.price),
    low: Math.min(lastCandle.close, tick.price),
    close: tick.price,
    volume: tick.volume,
  }

  return [...candles, nextCandle]
}
