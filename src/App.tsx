import { useState } from 'react'
import { useSimulatedFeed } from './hooks/useSimulatedFeed'
import { ChartSettingsPanel } from './features/chart-settings/ChartSettingsPanel'
import {
  getCandleCountForDuration,
  MAX_WINDOW_MS,
} from './features/chart-settings/chartSettings'
import { CustomCanvasChart } from './features/custom-canvas/CustomCanvasChart'
import './App.css'

const FEED_ANCHOR_TIMESTAMP = Date.now()
const START_PRICE = 100
const FEED_SEED = 42
const DEFAULT_CANDLE_INTERVAL_MS = 5_000
const DEFAULT_TICK_INTERVAL_MS = 100
const DEFAULT_WINDOW_MS = 60_000

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

interface CandleWorkspaceProps {
  candleIntervalMs: number
  tickIntervalMs: number
  windowMs: number
}

function CandleWorkspace({
  candleIntervalMs,
  tickIntervalMs,
  windowMs,
}: CandleWorkspaceProps) {
  const endTimestamp =
    Math.floor(FEED_ANCHOR_TIMESTAMP / candleIntervalMs) * candleIntervalMs
  const initialCount = getCandleCountForDuration(
    MAX_WINDOW_MS,
    candleIntervalMs,
  )
  const visibleCount = getCandleCountForDuration(windowMs, candleIntervalMs)
  const { candles, isRunning, start, pause, reset } =
    useSimulatedFeed({
      initialCount,
      endTimestamp,
      startPrice: START_PRICE,
      candleIntervalMs,
      tickIntervalMs,
      simulatedTickStepMs: tickIntervalMs,
      seed: FEED_SEED,
    })
  const latestCandle = candles.at(-1)

  return (
    <>
      <section className="feed-panel" aria-labelledby="feed-title">
        <div className="panel-heading">
          <div>
            <h2 id="feed-title">模拟行情</h2>
            <p>
              {candles.length} 根历史 K 线 · {candleIntervalMs / 1_000} 秒周期
            </p>
          </div>
          <span className={`status ${isRunning ? 'running' : ''}`}>
            {isRunning ? '运行中' : '已暂停'}
          </span>
        </div>

        <div className="controls" aria-label="行情控制">
          <button type="button" onClick={start} disabled={isRunning}>
            开始
          </button>
          <button type="button" onClick={pause} disabled={!isRunning}>
            暂停
          </button>
          <button type="button" className="secondary" onClick={reset}>
            重置
          </button>
        </div>

        {latestCandle ? (
          <dl className="ohlc-grid">
            <div className="timestamp-row">
              <dt>当前周期</dt>
              <dd>{dateTimeFormatter.format(latestCandle.timestamp)}</dd>
            </div>
            <div>
              <dt>Open</dt>
              <dd>{latestCandle.open.toFixed(4)}</dd>
            </div>
            <div>
              <dt>High</dt>
              <dd>{latestCandle.high.toFixed(4)}</dd>
            </div>
            <div>
              <dt>Low</dt>
              <dd>{latestCandle.low.toFixed(4)}</dd>
            </div>
            <div>
              <dt>Close</dt>
              <dd>{latestCandle.close.toFixed(4)}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{latestCandle.volume.toLocaleString('zh-CN')}</dd>
            </div>
          </dl>
        ) : (
          <p>当前没有行情数据。</p>
        )}
      </section>

      <section
        className="custom-chart-panel"
        aria-labelledby="custom-chart-title"
      >
        <div className="custom-chart-heading">
          <div>
            <h2 id="custom-chart-title">Custom Canvas</h2>
            <p>
              最近 {Math.min(visibleCount, candles.length)} 根 · 单 Canvas · 持续
              rAF
            </p>
          </div>
          <span className="learning-badge">BASELINE ENGINE</span>
        </div>
        <CustomCanvasChart candles={candles} visibleCount={visibleCount} />
      </section>
    </>
  )
}

function App() {
  const [candleIntervalMs, setCandleIntervalMs] = useState(
    DEFAULT_CANDLE_INTERVAL_MS,
  )
  const [tickIntervalMs, setTickIntervalMs] = useState(
    DEFAULT_TICK_INTERVAL_MS,
  )
  const [windowMs, setWindowMs] = useState(DEFAULT_WINDOW_MS)

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Phase 2 · Custom Canvas engine</p>
        <h1>React Canvas Candles</h1>
        <p>
          从模拟 OHLC 数据到坐标映射，完整验证 React 与 Canvas 的实时绘制链路。
        </p>
      </header>

      <ChartSettingsPanel
        candleIntervalMs={candleIntervalMs}
        tickIntervalMs={tickIntervalMs}
        windowMs={windowMs}
        onCandleIntervalChange={setCandleIntervalMs}
        onTickIntervalChange={setTickIntervalMs}
        onWindowChange={setWindowMs}
      />

      <CandleWorkspace
        key={candleIntervalMs}
        candleIntervalMs={candleIntervalMs}
        tickIntervalMs={tickIntervalMs}
        windowMs={windowMs}
      />
    </main>
  )
}

export default App
