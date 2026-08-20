import { useCallback, useEffect, useRef, useState } from 'react'
import { generateCandles } from '../domain/candles/generateCandles'
import { updateCandle } from '../domain/candles/updateCandle'
import type { Candle, PriceTick } from '../domain/candles/types'
import {
  calculatePriceChangeRatio,
  type VolatilityMode,
} from '../domain/market/volatility'

export interface SimulatedFeedOptions {
  initialCount: number
  endTimestamp: number
  startPrice: number
  candleIntervalMs: number
  tickIntervalMs: number
  simulatedTickStepMs: number
  seed: number
  volatilityMode: VolatilityMode
}

export interface SimulatedFeed {
  candles: Candle[]
  isRunning: boolean
  start: () => void
  pause: () => void
  reset: () => void
}

export function useSimulatedFeed(
  options: SimulatedFeedOptions,
): SimulatedFeed {
  const {
    initialCount,
    endTimestamp,
    startPrice,
    candleIntervalMs,
    tickIntervalMs,
    simulatedTickStepMs,
    seed,
    volatilityMode,
  } = options
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandles({
      count: initialCount,
      endTimestamp,
      intervalMs: candleIntervalMs,
      startPrice,
      seed,
    }),
  )
  const [isRunning, setIsRunning] = useState(false)
  const simulatedTimeRef = useRef(endTimestamp)
  const randomStateRef = useRef(seed >>> 0)

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const timerId = window.setInterval(() => {
      simulatedTimeRef.current += simulatedTickStepMs

      setCandles((previousCandles) => {
        const lastCandle = previousCandles.at(-1)

        if (!lastCandle) {
          return previousCandles
        }

        const nextRandom = () => {
          randomStateRef.current =
            (Math.imul(randomStateRef.current, 1_664_525) + 1_013_904_223) >>>
            0
          return randomStateRef.current / 4_294_967_296
        }
        const directionRandom = nextRandom()
        const spikeRandom = nextRandom()
        const volumeRandom = nextRandom()
        const changeRatio = calculatePriceChangeRatio(
          volatilityMode,
          directionRandom,
          spikeRandom,
        )
        const tick: PriceTick = {
          timestamp: simulatedTimeRef.current,
          price: Math.max(0.01, lastCandle.close * (1 + changeRatio)),
          volume: Math.max(1, Math.floor(volumeRandom * 20)),
        }

        return updateCandle(previousCandles, tick, candleIntervalMs)
      })
    }, tickIntervalMs)

    return () => {
      window.clearInterval(timerId)
    }
  }, [
    candleIntervalMs,
    isRunning,
    simulatedTickStepMs,
    tickIntervalMs,
    volatilityMode,
  ])

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setCandles(
      generateCandles({
        count: initialCount,
        endTimestamp,
        intervalMs: candleIntervalMs,
        startPrice,
        seed,
      }),
    )
    simulatedTimeRef.current = endTimestamp
    randomStateRef.current = seed >>> 0
  }, [
    candleIntervalMs,
    endTimestamp,
    initialCount,
    seed,
    startPrice,
  ])

  return { candles, isRunning, start, pause, reset }
}
