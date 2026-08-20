import { useSimulatedFeed } from './hooks/useSimulatedFeed'
import './App.css'

const CANDLE_INTERVAL_MS = 60_000

const FEED_OPTIONS = {
  initialCount: 120,
  endTimestamp:
    Math.floor(Date.now() / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS,
  startPrice: 100,
  candleIntervalMs: CANDLE_INTERVAL_MS,
  tickIntervalMs: 500,
  simulatedTickStepMs: 5_000,
  seed: 42,
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function App() {
  const { candles, isRunning, start, pause, reset } =
    useSimulatedFeed(FEED_OPTIONS)
  const latestCandle = candles.at(-1)

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Phase 1 · Simulated OHLC feed</p>
        <h1>React Canvas Candles</h1>
        <p>
          先验证历史数据生成和实时 K 线更新链路，暂不进行 Canvas 绘制。
        </p>
      </header>

      <section className="feed-panel" aria-labelledby="feed-title">
        <div className="panel-heading">
          <div>
            <h2 id="feed-title">模拟行情</h2>
            <p>{candles.length} 根 K 线 · 1 分钟周期</p>
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
    </main>
  )
}

export default App
