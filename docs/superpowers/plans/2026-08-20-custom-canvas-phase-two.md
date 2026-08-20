# Custom Canvas Phase Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. This is a mixed-learning plan: infrastructure is implemented by the assistant, while chart math and drawing remain learner-owned.

**Goal:** Build a responsive single-Canvas candlestick learning scaffold, then complete the data-to-pixel engine one tested unit at a time.

**Architecture:** React owns the simulated feed and Canvas lifecycle. Pure engine modules select visible candles, calculate the price range, map values to CSS-pixel coordinates, and draw complete frames. One continuous animation loop redraws the whole Canvas so a later phase can measure and improve it.

**Tech Stack:** React 19, TypeScript 6, Canvas 2D, Vitest 4, Vite 8

**Spec:** `docs/superpowers/specs/2026-08-20-custom-canvas-phase-two-design.md`

## Global Constraints

- Use one Canvas with a continuous `requestAnimationFrame` loop.
- Show the most recent 80 candles.
- Canvas logical height is 420 CSS pixels.
- Engine modules do not import React or access the DOM.
- Do not add crosshair, hover, panning, zooming, multiple Canvas layers, invalidation, indicators, or chart libraries.
- Keep intermediate work uncommitted; create one phase-two commit only after implementation and verification are complete.
- The assistant creates infrastructure and tests; the learner implements chart math and drawing.

---

### Task 1: Create engine contracts and learner test harness

**Files:**

- Create: `src/features/custom-canvas/engine/types.ts`
- Create: `src/features/custom-canvas/engine/visibleCandles.ts`
- Create: `src/features/custom-canvas/engine/visibleCandles.test.ts`
- Create: `src/features/custom-canvas/engine/priceRange.ts`
- Create: `src/features/custom-canvas/engine/priceRange.test.ts`
- Create: `src/features/custom-canvas/engine/scales.ts`
- Create: `src/features/custom-canvas/engine/scales.test.ts`

**Interfaces:**

```ts
interface PriceRange {
  min: number
  max: number
}

interface PlotRect {
  left: number
  top: number
  width: number
  height: number
}

interface ChartScales {
  toX: (index: number) => number
  toY: (price: number) => number
  candleStep: number
  candleBodyWidth: number
}

getVisibleCandles(candles: readonly Candle[], maxVisible?: number): Candle[]
calculatePriceRange(candles: readonly Candle[]): PriceRange | null
createChartScales(input: {
  candleCount: number
  priceRange: PriceRange
  plotRect: PlotRect
}): ChartScales
```

- [ ] Create the final types and function signatures.
- [ ] Give each learner-owned function an explicit `not implemented` exception body so TypeScript builds while behavior tests fail.
- [ ] Add visible-data tests for last-80 selection, short input, empty input, a custom limit, and input immutability.
- [ ] Add price-range tests for five-percent padding, highest-high/lowest-low discovery, a flat positive price, a flat zero price, and empty input.
- [ ] Add scale tests using a hand-checked `PlotRect` for first/last candle centers, top/bottom prices, midpoint price, step width, 65-percent body width, and one-pixel minimum width.
- [ ] Run `npm run test:run -- src/features/custom-canvas/engine` and confirm the new tests fail only because the three learner functions are not implemented.
- [ ] Run `npm run test:run -- src/domain` and confirm the existing 11 feed tests remain green.

### Task 2: Implement visible-candle selection

**Files:**

- Modify: `src/features/custom-canvas/engine/visibleCandles.ts`
- Test: `src/features/custom-canvas/engine/visibleCandles.test.ts`

**Behavior boundary:**

```text
normalize the limit to a non-negative integer
if the limit is zero, return []
otherwise return a new array containing the final limit items
never sort, reverse, splice, or mutate the input
```

- [ ] Run only `visibleCandles.test.ts` and observe the expected failure.
- [ ] Replace the exception body with the smallest implementation satisfying the boundary above.
- [ ] Run only `visibleCandles.test.ts` until it passes.
- [ ] Explain why `slice` preserves the original time order and input array.

### Task 3: Implement automatic price range

**Files:**

- Modify: `src/features/custom-canvas/engine/priceRange.ts`
- Test: `src/features/custom-canvas/engine/priceRange.test.ts`

**Behavior boundary:**

```text
empty candles → null
rawMin → minimum candle.low
rawMax → maximum candle.high
normal padding → (rawMax - rawMin) * 0.05 on both sides
flat padding → max(abs(rawMax) * 0.01, 1) on both sides
```

- [ ] Run only `priceRange.test.ts` and observe the expected failure.
- [ ] Implement the empty-input branch.
- [ ] Scan once to calculate raw minimum and maximum.
- [ ] Select normal or flat padding without changing the input.
- [ ] Run only `priceRange.test.ts` until it passes.
- [ ] Explain why a zero price span would otherwise break `toY`.

### Task 4: Implement chart scales

**Files:**

- Modify: `src/features/custom-canvas/engine/scales.ts`
- Test: `src/features/custom-canvas/engine/scales.test.ts`

**Behavior boundary:**

```text
candleStep → plotRect.width / candleCount
toX(index) → plotRect.left + (index + 0.5) * candleStep
candleBodyWidth → max(1, candleStep * 0.65)
priceRatio → (priceRange.max - price) / (priceRange.max - priceRange.min)
toY(price) → plotRect.top + priceRatio * plotRect.height
```

- [ ] Run only `scales.test.ts` and observe the expected failure.
- [ ] Implement horizontal slot sizing and center coordinates.
- [ ] Implement the inverted Canvas Y mapping.
- [ ] Apply the one-pixel minimum candle body width.
- [ ] Run only `scales.test.ts` until it passes.
- [ ] Run all three engine test files and confirm they pass together.
- [ ] Explain why the maximum price maps to the smallest Y value.

### Task 5: Add the runnable Canvas lifecycle scaffold

**Files:**

- Create: `src/features/custom-canvas/CustomCanvasChart.tsx`
- Create: `src/features/custom-canvas/customCanvas.css`
- Create: `src/features/custom-canvas/hooks/useCanvasRenderer.ts`
- Create: `src/features/custom-canvas/engine/drawGrid.ts`
- Create: `src/features/custom-canvas/engine/drawCandles.ts`
- Create: `src/features/custom-canvas/engine/drawFrame.ts`
- Modify: `src/App.tsx`

**Interfaces:**

```ts
interface CustomCanvasChartProps {
  candles: readonly Candle[]
}

useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  candles: readonly Candle[],
): void
```

- [ ] Render one accessible Canvas with `width: 100%` and `height: 420px` beneath the feed controls.
- [ ] Store the latest candle array in a ref updated by an effect; do not update React state from animation frames.
- [ ] Observe the Canvas CSS size and set its backing width/height to CSS size multiplied by `devicePixelRatio`.
- [ ] Set the context transform so all engine coordinates remain CSS pixels.
- [ ] Start one continuous animation loop and cancel it during cleanup.
- [ ] Disconnect the `ResizeObserver` during cleanup.
- [ ] Keep `drawGrid` and `drawCandles` as typed no-op functions owned by the learner.
- [ ] Make `drawFrame` clear the Canvas, paint `#111827`, and display a short fallback message without calling unfinished drawing functions.
- [ ] Run `npm run lint` and `npm run build`; both must pass with the fallback Canvas mounted.
- [ ] Open the application and resize the window to confirm the fallback Canvas remains sharp and responsive.

### Task 6: Implement grid, candlesticks, and frame composition

**Files:**

- Modify: `src/features/custom-canvas/engine/drawGrid.ts`
- Modify: `src/features/custom-canvas/engine/drawCandles.ts`
- Modify: `src/features/custom-canvas/engine/drawFrame.ts`

**Composition boundary:**

```text
drawFrame
→ clear and paint background
→ getVisibleCandles(candles, 80)
→ return after drawing an empty-state label if no candles exist
→ calculatePriceRange
→ derive PlotRect from 12/20/64/28 pixel insets
→ createChartScales
→ drawGrid
→ drawCandles
```

- [ ] In `drawGrid`, draw five horizontal and six vertical lines using `#253047`.
- [ ] Calculate each horizontal grid price by linearly interpolating from range maximum to minimum.
- [ ] Draw price labels inside the reserved right inset using `#94a3b8`.
- [ ] In `drawCandles`, draw each high-to-low wick at `toX(index)`.
- [ ] Draw rising candles with `#22c55e` and falling candles with `#ef4444`.
- [ ] Center each body on its X coordinate and enforce a one-CSS-pixel doji height.
- [ ] Replace the fallback `drawFrame` body with the composition boundary above.
- [ ] Manually verify static grid, axes, wicks, bodies, colors, and alignment.
- [ ] Start the feed and verify the last candle changes and a new candle appears after approximately six real seconds.

### Task 7: Complete phase-two verification and handoff

**Files:**

- Review all files under `src/features/custom-canvas/`
- Review: `src/App.tsx`
- Review: `docs/superpowers/specs/2026-08-20-custom-canvas-phase-two-design.md`
- Review: `docs/superpowers/plans/2026-08-20-custom-canvas-phase-two.md`

- [ ] Run `npm run test:run` and confirm every domain and engine test passes.
- [ ] Run `npm run lint -- --no-cache` and confirm zero errors.
- [ ] Run `npm run build` and confirm a successful production build.
- [ ] Verify the browser console contains no errors.
- [ ] Verify pause stops feed changes while the intentional rAF loop continues.
- [ ] Verify resize and DPR behavior in the browser.
- [ ] Inspect `git diff --check` and the exact staged scope.
- [ ] Review the learner-owned functions together and make sure the learner can explain visible selection, range padding, X/Y mapping, and full-frame redraw.
- [ ] Only after explicit authorization, create one phase-two commit and push it.
