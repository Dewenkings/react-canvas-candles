# Lightweight Charts Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-correct Lightweight Charts candlestick panel below the existing Custom Canvas panel, driven by the same simulated Candle array.

**Architecture:** Keep `useSimulatedFeed` as the only market-data owner. A pure adapter converts millisecond domain candles into Lightweight Charts data, a pure sync-decision helper selects `setData` versus `update`, and a React hook owns the imperative chart lifecycle. Both charts render simultaneously from the same props.

**Tech Stack:** React 19, TypeScript 6, Vitest 4, Lightweight Charts 5.x, Vite 8

**Spec:** `docs/superpowers/specs/2026-08-20-lightweight-charts-comparison-design.md`

## Global Constraints

- Use the current Lightweight Charts v5 API: `chart.addSeries(CandlestickSeries, options)`.
- Domain timestamps remain milliseconds; library timestamps are integer Unix seconds.
- Use `setData` for initialization or non-incremental replacement and `update` for the latest bar.
- Share the existing `candles`; do not create a second feed.
- Keep the existing Custom Canvas behavior unchanged.
- Include TradingView attribution.
- Do not add KLineChart, ECharts, volume panes, indicators, or performance benchmarking.
- Do not create intermediate git commits; the user will explicitly request commit/push when ready.

---

### Task 1: Candle adapter and logical range

**Files:**
- Create: `src/features/lightweight-charts/candleAdapter.test.ts`
- Create: `src/features/lightweight-charts/candleAdapter.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `Candle` from `src/domain/candles/types.ts`
- Produces: `toLightweightCandle(candle)`, `toLightweightCandles(candles)`, and `createVisibleLogicalRange(candleCount, visibleCount)`

- [ ] **Step 1: Install Lightweight Charts 5.x**

Run:

```bash
npm install lightweight-charts@^5
```

- [ ] **Step 2: Write failing adapter tests**

Cover these assertions:

```ts
expect(toLightweightCandle(candle)).toEqual({
  time: 1_720_000_005 as UTCTimestamp,
  open: 100,
  high: 103,
  low: 99,
  close: 102,
})
expect(toLightweightCandles(candles)).toHaveLength(candles.length)
expect(candles).toEqual(snapshot)
expect(createVisibleLogicalRange(120, 12)).toEqual({
  from: 108,
  to: 119.5,
})
expect(createVisibleLogicalRange(0, 12)).toBeNull()
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm run test:run -- src/features/lightweight-charts/candleAdapter.test.ts
```

Expected: FAIL because `candleAdapter.ts` does not exist.

- [ ] **Step 4: Implement the adapter**

Use these exact signatures:

```ts
export function toLightweightCandle(
  candle: Candle,
): CandlestickData<UTCTimestamp>

export function toLightweightCandles(
  candles: readonly Candle[],
): CandlestickData<UTCTimestamp>[]

export function createVisibleLogicalRange(
  candleCount: number,
  visibleCount: number,
): LogicalRange | null
```

Convert time with `Math.floor(candle.timestamp / 1_000) as UTCTimestamp`, map arrays without mutation, clamp visible count to at least one, and return `null` for an empty series.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the focused command from Step 3. Expected: all adapter tests pass.

### Task 2: Incremental synchronization decision

**Files:**
- Create: `src/features/lightweight-charts/candleSync.test.ts`
- Create: `src/features/lightweight-charts/candleSync.ts`

**Interfaces:**
- Consumes: previous and next `readonly Candle[]`
- Produces: `getCandleSyncMode(previousCandles, nextCandles): 'none' | 'replace' | 'update'`

- [ ] **Step 1: Write failing synchronization tests**

Cover:

```text
no previous snapshot + data        → replace
empty next array                   → replace
same data                          → none
only last OHLC changed             → update
one new final candle               → update
array shrank during reset          → replace
first timestamp changed            → replace
an older candle changed            → replace
more than one candle appended      → replace
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:run -- src/features/lightweight-charts/candleSync.test.ts
```

Expected: FAIL because `candleSync.ts` does not exist.

- [ ] **Step 3: Implement the minimal decision helper**

Use:

```ts
export type CandleSyncMode = 'none' | 'replace' | 'update'

export function getCandleSyncMode(
  previousCandles: readonly Candle[] | null,
  nextCandles: readonly Candle[],
): CandleSyncMode
```

Compare Candle values rather than array identity. Permit incremental update only when the arrays have equal length with only the last Candle changed, or when exactly one final Candle was appended and all preceding values match.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: all synchronization tests pass.

### Task 3: React chart lifecycle

**Files:**
- Create: `src/features/lightweight-charts/useLightweightChart.ts`
- Create: `src/features/lightweight-charts/LightweightChart.tsx`
- Create: `src/features/lightweight-charts/lightweightChart.css`

**Interfaces:**
- Consumes: `{ candles: readonly Candle[]; visibleCount: number }`
- Produces: a responsive, interactive Lightweight Charts panel

- [ ] **Step 1: Implement `useLightweightChart` chart creation**

Create one chart in an effect using `createChart(container, { autoSize: true })`, dark layout colors, visible grid, right price scale, time scale with seconds visible, and a Candlestick series with the existing green/red palette. Provide the same local-time formatter to `localization.timeFormatter` and `timeScale.tickMarkFormatter` so the library does not display UTC labels beside the locally formatted Custom Canvas.

- [ ] **Step 2: Implement the data synchronization effect**

Keep chart, series, and previous Candle snapshot in refs. For `replace`, call `series.setData(toLightweightCandles(candles))`; for `update`, call `series.update(toLightweightCandle(candles.at(-1)!))`; for `none`, do not write series data. Apply `createVisibleLogicalRange` after replacement, append, or `visibleCount` change.

- [ ] **Step 3: Implement cleanup**

The chart creation effect returns:

```ts
return () => {
  chart.remove()
  chartRef.current = null
  seriesRef.current = null
  previousCandlesRef.current = null
}
```

- [ ] **Step 4: Build the presentational component and styles**

Render a 420px chart host with an accessible label and this attribution:

```tsx
<a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
  Charts by TradingView
</a>
```

The component must not own feed state or call library APIs directly.

### Task 4: Mount the comparison panel

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: the existing `candles` and `visibleCount` in `CandleWorkspace`
- Produces: a second panel directly below Custom Canvas

- [ ] **Step 1: Add the panel**

Import `LightweightChart`, render the title `Lightweight Charts`, the badge `MATURE LIBRARY`, and pass the same `candles` and `visibleCount` used by `CustomCanvasChart`.

- [ ] **Step 2: Add comparison copy**

Label the mature path as `setData 初始化 · update 增量更新 · 库内置坐标轴与十字线` without adding a benchmark claim.

- [ ] **Step 3: Run static verification**

Run separately:

```bash
npm run test:run
npm run lint -- --no-cache
npm run build
git diff --check
```

Expected: all tests pass, lint and build exit zero, and diff check is clean.

### Task 5: Browser behavior verification

**Files:**
- No repository files; use a temporary browser script and screenshot outside the repository

**Interfaces:**
- Consumes: the running Vite application
- Produces: evidence that both implementations receive the same feed and that the library cleansly renders/resizes

- [ ] **Step 1: Start Vite and inspect the page**

Verify both `Custom Canvas` and `Lightweight Charts` headings exist and that the mature panel contains library-created Canvas elements.

- [ ] **Step 2: Exercise the feed**

Click Start, observe both latest-price displays change, wait for a new Candle, pause, then reset. Capture console errors throughout.

- [ ] **Step 3: Exercise window and resize behavior**

Change the visible window and viewport width. Confirm the mature chart remains visible, resizes to its host, and retains crosshair interaction.

- [ ] **Step 4: Capture final evidence**

Save one screenshot under `/private/tmp` and report the interaction assertions and console result.
