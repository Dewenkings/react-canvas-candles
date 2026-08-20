import { useState } from 'react'
import { useSimulatedFeed } from './hooks/useSimulatedFeed'
import { ChartSettingsPanel } from './features/chart-settings/ChartSettingsPanel'
import {
  getCandleCountForDuration,
  MAX_WINDOW_MS,
} from './features/chart-settings/chartSettings'
import { CustomCanvasChart } from './features/custom-canvas/CustomCanvasChart'
import { EChartsPanel } from './features/echarts/EChartsPanel'
import { KLineChartPanel } from './features/kline-chart/KLineChartPanel'
import { LightweightChart } from './features/lightweight-charts/LightweightChart'
import type { VolatilityMode } from './domain/market/volatility'
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
  volatilityMode: VolatilityMode
}

function CandleWorkspace({
  candleIntervalMs,
  tickIntervalMs,
  windowMs,
  volatilityMode,
}: CandleWorkspaceProps) {
  const endTimestamp =
    Math.floor(FEED_ANCHOR_TIMESTAMP / candleIntervalMs) * candleIntervalMs
  const initialCount = getCandleCountForDuration(
    MAX_WINDOW_MS,
    candleIntervalMs,
  )
  const visibleCount = getCandleCountForDuration(windowMs, candleIntervalMs)
  const { candles, isRunning, resetVersion, start, pause, reset } =
    useSimulatedFeed({
      initialCount,
      endTimestamp,
      startPrice: START_PRICE,
      candleIntervalMs,
      tickIntervalMs,
      simulatedTickStepMs: tickIntervalMs,
      seed: FEED_SEED,
      volatilityMode,
    })
  const latestCandle = candles.at(-1)

  return (
    <>
      <section className="feed-panel" aria-labelledby="feed-title">
        <div className="panel-heading">
          <div>
            <p className="panel-label">SHARED MARKET FEED</p>
            <h2 id="feed-title">模拟行情</h2>
            <p>
              {candles.length} 根历史 K 线 · {candleIntervalMs / 1_000} 秒周期
            </p>
          </div>
          <div className="feed-actions">
            <span
              className={`status ${isRunning ? 'running' : ''}`}
              role="status"
              aria-live="polite"
            >
              {isRunning ? '运行中' : '已暂停'}
            </span>
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
          </div>
        </div>

        {latestCandle ? (
          <dl className="ohlc-grid">
            <div className="timestamp-row market-time">
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

      <section className="comparison-grid" aria-label="K 线渲染方案对比">
        <section
          className="custom-chart-panel chart-card--custom"
          aria-labelledby="custom-chart-title"
        >
          <div className="custom-chart-heading">
            <div>
              <span className="chart-index">01 · FROM SCRATCH</span>
              <h2 id="custom-chart-title">Custom Canvas</h2>
              <p>
                默认窗口 {Math.min(visibleCount, candles.length)} bars · 双
                Canvas · 按需绘制
              </p>
            </div>
            <span className="learning-badge">ENGINE</span>
          </div>
          <CustomCanvasChart
            candles={candles}
            visibleCount={visibleCount}
            resetVersion={resetVersion}
          />
        </section>

        <section
          className="custom-chart-panel chart-card--lightweight"
          aria-labelledby="lightweight-chart-title"
        >
          <div className="custom-chart-heading">
            <div>
              <span className="chart-index">02 · FINANCIAL CORE</span>
              <h2 id="lightweight-chart-title">Lightweight Charts</h2>
              <p>series.update · 金融坐标轴 · 内置十字线</p>
            </div>
            <span className="learning-badge">LEAN</span>
          </div>
          <LightweightChart
            candles={candles}
            visibleCount={visibleCount}
          />
        </section>

        <section
          className="custom-chart-panel chart-card--kline"
          aria-labelledby="kline-chart-title"
        >
          <div className="custom-chart-heading">
            <div>
              <span className="chart-index">03 · TRADING TOOLKIT</span>
              <h2 id="kline-chart-title">KLineChart</h2>
              <p>DataLoader · MA 覆盖层 · VOL pane</p>
            </div>
            <span className="learning-badge">TERMINAL</span>
          </div>
          <KLineChartPanel
            candles={candles}
            visibleCount={visibleCount}
            candleIntervalMs={candleIntervalMs}
          />
        </section>

        <section
          className="custom-chart-panel chart-card--echarts"
          aria-labelledby="echarts-title"
        >
          <div className="custom-chart-heading">
            <div>
              <span className="chart-index">04 · GENERAL VISUALIZATION</span>
              <h2 id="echarts-title">ECharts</h2>
              <p>setOption · K 线与成交量双 Grid · DataZoom</p>
            </div>
            <span className="learning-badge">CONFIG</span>
          </div>
          <EChartsPanel
            candles={candles}
            visibleCount={visibleCount}
          />
        </section>
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
  const [volatilityMode, setVolatilityMode] =
    useState<VolatilityMode>('normal')

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="header-copy">
          <p className="eyebrow">RENDERING LAB / 04 APPROACHES</p>
          <h1>
            React Candlestick
            <span> Rendering Lab</span>
          </h1>
          <p className="page-intro">
            同一份实时 OHLC 行情，四种 React K 线渲染路径。
            从零理解像素链路，再对照成熟库的工程边界。
          </p>
        </div>
        <div className="header-manifest" aria-label="实验说明">
          <span>ONE FEED</span>
          <span>FOUR RENDERERS</span>
          <span>FAIR COMPARISON</span>
        </div>
      </header>

      <ChartSettingsPanel
        candleIntervalMs={candleIntervalMs}
        tickIntervalMs={tickIntervalMs}
        windowMs={windowMs}
        volatilityMode={volatilityMode}
        onCandleIntervalChange={setCandleIntervalMs}
        onTickIntervalChange={setTickIntervalMs}
        onWindowChange={setWindowMs}
        onVolatilityModeChange={setVolatilityMode}
      />

      <CandleWorkspace
        key={candleIntervalMs}
        candleIntervalMs={candleIntervalMs}
        tickIntervalMs={tickIntervalMs}
        windowMs={windowMs}
        volatilityMode={volatilityMode}
      />
    </main>
  )
}

export default App
