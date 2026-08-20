# KLineChart v10 Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a KLineChart v10 trading-terminal comparison panel with native DataLoader integration, MA overlay, and VOL pane, driven by the existing simulated Candle feed.

**Architecture:** Move the library-neutral Candle synchronization decision into the domain layer. Adapt domain Candles directly to KLineChart millisecond `KLineData`, then bridge React state into v10 `getBars` and `subscribeBar` callbacks. A dedicated hook owns init, indicators, resize, bar spacing, reset, realtime push, and dispose.

**Tech Stack:** React 19, TypeScript 6, Vitest 4, KLineChart 10.x, Vite 8

**Spec:** `docs/superpowers/specs/2026-08-20-klinechart-v10-comparison-design.md`

## Global Constraints

- Use `klinecharts@^10` and the v10 `setDataLoader` API.
- Do not call removed v9 APIs such as `applyNewData` or `updateData`.
- Reuse the existing `candles`; do not create another timer or feed.
- Keep timestamps in milliseconds for KLineChart.
- Add MA to `candle_pane` and create a separate VOL pane.
- Keep ECharts out of this implementation.
- Do not create intermediate commits; the user will request commit/push explicitly.

---

### Task 1: Move Candle synchronization into the domain layer

**Files:**
- Move: `src/features/lightweight-charts/candleSync.ts` → `src/domain/candles/candleSync.ts`
- Move: `src/features/lightweight-charts/candleSync.test.ts` → `src/domain/candles/candleSync.test.ts`
- Modify: `src/features/lightweight-charts/useLightweightChart.ts`

**Interfaces:**
- Produces: `getCandleSyncMode(previousCandles, nextCandles): 'none' | 'replace' | 'update'`
- Consumers: Lightweight Charts and KLineChart hooks

- [ ] **Step 1: Move implementation and tests without behavior changes**

Update imports so the moved files use `./types` and Lightweight Charts imports from `../../domain/candles/candleSync`.

- [ ] **Step 2: Verify the existing regression suite stays green**

Run:

```bash
npm run test:run -- src/domain/candles/candleSync.test.ts src/features/lightweight-charts
```

Expected: the nine synchronization cases and all Lightweight Charts tests pass.

### Task 2: Install KLineChart and adapt Candle data

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/kline-chart/klineAdapter.test.ts`
- Create: `src/features/kline-chart/klineAdapter.ts`

**Interfaces:**
- Consumes: `Candle`
- Produces: `toKLineData(candle)` and `toKLineDataList(candles)`

- [ ] **Step 1: Install the current KLineChart v10 package**

Run:

```bash
npm install klinecharts@^10
```

- [ ] **Step 2: Write failing adapter tests**

Use a literal Candle and assert:

```ts
expect(toKLineData(candle)).toEqual({
  timestamp: 1_720_000_005_000,
  open: 100,
  high: 103,
  low: 99,
  close: 102,
  volume: 42,
})
```

Also verify list order and that the source array remains equal to a structured clone.

- [ ] **Step 3: Run focused test and verify RED**

Run:

```bash
npm run test:run -- src/features/kline-chart/klineAdapter.test.ts
```

Expected: FAIL because `klineAdapter.ts` does not exist.

- [ ] **Step 4: Implement the minimal adapter**

Use:

```ts
export function toKLineData(candle: Candle): KLineData
export function toKLineDataList(candles: readonly Candle[]): KLineData[]
```

Map OHLCV directly and preserve the millisecond timestamp.

- [ ] **Step 5: Run focused test and verify GREEN**

Expected: all adapter tests pass.

### Task 3: Period and visible-window math

**Files:**
- Create: `src/features/kline-chart/chartGeometry.test.ts`
- Create: `src/features/kline-chart/chartGeometry.ts`

**Interfaces:**
- Produces: `toKLinePeriod(candleIntervalMs)` and `calculateBarSpace(containerWidth, visibleCount)`

- [ ] **Step 1: Write failing tests**

Cover these literal cases:

```ts
expect(toKLinePeriod(1_000)).toEqual({ type: 'second', span: 1 })
expect(toKLinePeriod(10_000)).toEqual({ type: 'second', span: 10 })
expect(() => toKLinePeriod(1_500)).toThrow()
expect(() => toKLinePeriod(0)).toThrow()
expect(calculateBarSpace(800, 80)).toBe(10)
expect(calculateBarSpace(800, 1)).toBe(50)
expect(calculateBarSpace(10, 80)).toBe(1)
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
npm run test:run -- src/features/kline-chart/chartGeometry.test.ts
```

Expected: FAIL because `chartGeometry.ts` does not exist.

- [ ] **Step 3: Implement validation and clamping**

Use exact signatures:

```ts
export function toKLinePeriod(candleIntervalMs: number): Period
export function calculateBarSpace(
  containerWidth: number,
  visibleCount: number,
): number | null
```

Require a positive integer number of seconds. Return `null` for a non-finite or non-positive container width; otherwise calculate `containerWidth / max(1, visibleCount)` and clamp to 1–50. The hook must skip resize/bar-space updates for `null`, because responsive layout can report a transient zero width.

- [ ] **Step 4: Run focused test and verify GREEN**

Expected: all geometry tests pass.

### Task 4: KLineChart v10 lifecycle and DataLoader

**Files:**
- Create: `src/features/kline-chart/useKLineChart.ts`
- Create: `src/features/kline-chart/KLineChartPanel.tsx`
- Create: `src/features/kline-chart/klineChart.css`

**Interfaces:**
- Consumes: `candles`, `visibleCount`, and `candleIntervalMs`
- Produces: responsive KLineChart instance with MA and VOL

- [ ] **Step 1: Initialize the chart**

Inside a mount effect:

```text
init(container, dark options)
→ setSymbol({ ticker: 'SIMULATED', pricePrecision: 4, volumePrecision: 0 })
→ setPeriod(toKLinePeriod(candleIntervalMs))
→ setDataLoader({ getBars, subscribeBar, unsubscribeBar })
→ createIndicator({ name: 'MA', paneId: 'candle_pane' }, true)
→ createIndicator('VOL')
```

Use `candlesRef.current` inside `getBars`. Return all current data only for `type === 'init'`; return `[]` for boundary requests, always with `more: false`.

- [ ] **Step 2: Bridge React updates to DataLoader**

Store the `subscribeBar` callback in a ref. Use domain `getCandleSyncMode`:

```text
none    → no chart data call
update  → callback(toKLineData(latest))
replace → chart.resetData()
```

On append, call `chart.scrollToRealTime()` after pushing the new bar.

- [ ] **Step 3: Implement resize and visible window**

Observe the host element. KLineChart's internal observer owns Canvas resize and DPR. The integration observer only recalculates bar space on host resize; `visibleCount` changes do the same:

```ts
chart.setBarSpace(calculateBarSpace(host.clientWidth, visibleCount))
```

- [ ] **Step 4: Implement cleanup**

Disconnect ResizeObserver, clear realtime callback and refs, then call `dispose(chart)`. Cleanup must tolerate React StrictMode setup/cleanup/setup.

- [ ] **Step 5: Build the panel and styles**

Render an accessible 520px host with no local feed state. Use a dark background and avoid CSS transforms.

### Task 5: Mount KLineChart below existing comparisons

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: the same `candles`, `visibleCount`, and `candleIntervalMs` already available in `CandleWorkspace`
- Produces: third chart panel

- [ ] **Step 1: Render the panel**

Add a section below Lightweight Charts with:

```text
Title: KLineChart
Description: DataLoader · MA overlay · VOL pane · 完整 K 线交互
Badge: TRADING TERMINAL
```

Pass the shared props directly to `KLineChartPanel`.

- [ ] **Step 2: Run static verification**

Run separately:

```bash
npm run test:run
npm run lint -- --no-cache
npm run build
git diff --check
```

Expected: all commands exit zero.

### Task 6: Browser verification

**Files:**
- No repository files; use a temporary Playwright script and screenshot under `/private/tmp`

**Interfaces:**
- Produces: end-to-end evidence for the three-chart shared feed

- [ ] **Step 1: Verify structure and indicators**

Confirm all three headings exist, KLineChart creates Canvas elements, and the KLineChart host contains distinct main and indicator pane rendering.

- [ ] **Step 2: Verify shared updates**

Capture Canvas signatures, click Start, and confirm Custom Canvas, Lightweight Charts, and KLineChart all change. Pause and confirm all three remain stable.

- [ ] **Step 3: Verify reset, window and resize**

Exercise visible-window controls and viewport resize, confirm KLineChart redraws and remains interactive, then reset the feed.

- [ ] **Step 4: Verify diagnostics**

Move the pointer over KLineChart to trigger crosshair, capture the final screenshot, and assert there are no console or page errors.
