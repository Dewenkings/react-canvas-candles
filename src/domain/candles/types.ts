export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface PriceTick {
  timestamp: number
  price: number
  volume: number
}

export interface GenerateCandlesOptions {
  count: number
  endTimestamp: number
  intervalMs: number
  startPrice: number
  seed: number
}
