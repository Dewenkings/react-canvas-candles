# Dual Canvas Invalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the continuous single-Canvas renderer with stacked base and overlay canvases that share one frame model and redraw only when their own inputs are invalidated.

**Architecture:** A pure `createChartFrameModel` function owns visible-range, price-range, plot-rectangle, and scale calculation. `useDualCanvasRenderer` stores that model in a ref, coalesces base and overlay invalidations into independent one-shot animation frames, and ensures the overlay always redraws after a base-model change.

**Tech Stack:** React 19, TypeScript, Canvas 2D, ResizeObserver, requestAnimationFrame, Vitest, ESLint, Vite, Playwright browser verification.

**Spec:** `docs/superpowers/specs/2026-08-20-dual-canvas-invalidation-design.md`

## Global Constraints

- Render grid, time axis, Candles, and latest price only on the base Canvas.
- Render crosshair, hover OHLC, and interactive axis labels only on the transparent overlay Canvas.
- Do not keep any self-scheduling animation loop.
- Coalesce repeated invalidations so each layer has at most one pending rAF.
- Pointer movement must not update React state or invalidate the base layer.
- Both canvases use identical CSS and DPR backing dimensions.
- Do not add npm dependencies.
- Do not commit, push, merge, or create a PR without separate user authorization.

## File Map

- Create `src/features/custom-canvas/engine/createChartFrameModel.ts`: pure shared-frame-model assembly.
- Create `src/features/custom-canvas/engine/createChartFrameModel.test.ts`: visible-window, empty-data, and geometry tests.
- Create `src/features/custom-canvas/engine/drawBaseFrame.ts`: base background and static chart drawing.
- Create `src/features/custom-canvas/engine/drawOverlayFrame.ts`: transparent overlay clearing and crosshair drawing.
- Create `src/features/custom-canvas/hooks/useDualCanvasRenderer.ts`: sizing, pointer handling, and two invalidation schedulers.
- Modify `src/features/custom-canvas/engine/types.ts`: declare `ChartFrameModel`.
- Modify `src/features/custom-canvas/engine/drawGrid.ts`: remove pointer-dependent tick suppression.
- Modify `src/features/custom-canvas/engine/drawCrosshair.ts`: paint a dark collision mask before its compact time label.
- Modify `src/features/custom-canvas/CustomCanvasChart.tsx`: render and connect two canvases.
- Modify `src/features/custom-canvas/customCanvas.css`: stack both canvases and route pointer events to the overlay.
- Delete `src/features/custom-canvas/engine/drawFrame.ts` after all imports move.
- Delete `src/features/custom-canvas/hooks/useCanvasRenderer.ts` after all imports move.

---

### Task 1: Shared Chart Frame Model

**Files:**
- Create: `src/features/custom-canvas/engine/createChartFrameModel.test.ts`
- Create: `src/features/custom-canvas/engine/createChartFrameModel.ts`
- Modify: `src/features/custom-canvas/engine/types.ts`

**Interfaces:**
- Consumes: `getVisibleCandles`, `calculatePriceRange`, and `createChartScales`.
- Produces: `ChartFrameModel` and `createChartFrameModel(input): ChartFrameModel | null`.

- [ ] **Step 1: Write failing frame-model tests**

Create three hand-written Candles and assert:

```ts
const model = createChartFrameModel({
  candles,
  visibleCount: 2,
  width: 800,
  height: 420,
})

expect(model?.visibleCandles).toEqual(candles.slice(-2))
expect(model?.plotRect).toEqual({
  left: 12,
  top: 20,
  width: 724,
  height: 372,
})
expect(model?.priceRange.min).toBeLessThan(98)
expect(model?.priceRange.max).toBeGreaterThan(105)
expect(model?.scales.toX(0)).toBeGreaterThan(12)
```

Also assert empty Candles and a `width` smaller than the 76px horizontal insets return `null`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- src/features/custom-canvas/engine/createChartFrameModel.test.ts`

Expected: FAIL because the module is missing, then fail through an explicit not-implemented stub before behavior is added.

- [ ] **Step 3: Declare and implement the frame model**

Add to `types.ts`:

```ts
export interface ChartFrameModel {
  visibleCandles: readonly Candle[]
  priceRange: PriceRange
  plotRect: PlotRect
  scales: ChartScales
}
```

Implement with exact insets `{ top: 20, right: 64, bottom: 28, left: 12 }`:

```ts
export function createChartFrameModel({
  candles,
  visibleCount,
  width,
  height,
}: CreateChartFrameModelInput): ChartFrameModel | null {
  const visibleCandles = getVisibleCandles(candles, visibleCount)
  const priceRange = calculatePriceRange(visibleCandles)
  const plotRect = {
    left: 12,
    top: 20,
    width: Math.max(0, width - 12 - 64),
    height: Math.max(0, height - 20 - 28),
  }

  if (!priceRange || plotRect.width === 0 || plotRect.height === 0) return null

  return {
    visibleCandles,
    priceRange,
    plotRect,
    scales: createChartScales({
      candleCount: visibleCandles.length,
      priceRange,
      plotRect,
    }),
  }
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `npm run test:run -- src/features/custom-canvas/engine/createChartFrameModel.test.ts && npm run test:run`

Expected: focused and full suites PASS.

---

### Task 2: Separate Base and Overlay Drawing

**Files:**
- Create: `src/features/custom-canvas/engine/drawBaseFrame.ts`
- Create: `src/features/custom-canvas/engine/drawOverlayFrame.ts`
- Modify: `src/features/custom-canvas/engine/drawGrid.ts`
- Modify: `src/features/custom-canvas/engine/drawCrosshair.ts`
- Keep temporarily: `src/features/custom-canvas/engine/drawFrame.ts`

**Interfaces:**
- Consumes: `ChartFrameModel | null`, `PointerState`, CSS width, and CSS height.
- Produces: `drawBaseFrame(input): void` and `drawOverlayFrame(input): void`.

- [ ] **Step 1: Implement the static base drawing boundary**

```ts
interface DrawBaseFrameInput {
  context: CanvasRenderingContext2D
  model: ChartFrameModel | null
  width: number
  height: number
}
```

Always clear and paint `#111827`. If `model` is null, draw centered `No candle data`; otherwise call:

```text
drawGrid(model without pointer)
drawCandles(model.visibleCandles, model.scales)
drawLatestPrice(model.visibleCandles, model.plotRect, model.scales)
```

- [ ] **Step 2: Remove pointer dependence from the static grid**

Delete `pointer` from `DrawGridInput` and remove `hoveredCandleX` plus its label-skipping branch. The base grid must be identical regardless of mouse position.

- [ ] **Step 3: Implement the transparent overlay boundary**

```ts
interface DrawOverlayFrameInput {
  context: CanvasRenderingContext2D
  model: ChartFrameModel | null
  pointer: PointerState
  width: number
  height: number
}
```

Always call `clearRect(0, 0, width, height)`. Return for a null model; otherwise pass the model fields and pointer into `drawCrosshair` without painting a background.

- [ ] **Step 4: Add the top-layer time-axis collision mask**

In `drawCrosshair`, before the compact 84px light time label, paint a `#111827` mask centered on `snappedX`, clamped to the plot, with width `Math.min(176, plotRect.width)` and height 24. Then paint the compact label above that mask. This hides conflicting base-axis labels without invalidating the base Canvas.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build`

Expected: all commands exit 0 while the old single renderer still compiles.

---

### Task 3: Dual Invalidation Renderer Hook

**Files:**
- Create: `src/features/custom-canvas/hooks/useDualCanvasRenderer.ts`
- Keep temporarily: `src/features/custom-canvas/hooks/useCanvasRenderer.ts`

**Interfaces:**
- Consumes: container/base/overlay refs, `readonly Candle[]`, and `visibleCount`.
- Produces: no return value; owns both Canvas lifecycles.

- [ ] **Step 1: Define the hook and latest-input refs**

```ts
export function useDualCanvasRenderer(
  containerRef: RefObject<HTMLDivElement | null>,
  baseCanvasRef: RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
): void
```

Maintain `candlesRef`, `visibleCountRef`, `pointerRef`, `frameModelRef`, `invalidateBaseRef`, and `invalidateOverlayRef`. Data effects update only the latest-input refs and call `invalidateBaseRef.current()`.

- [ ] **Step 2: Implement synchronized size management**

Within the mount effect, get both 2D contexts and define `syncCanvasSize()` to:

```text
read the base Canvas CSS bounds so container borders are excluded
read max(1, devicePixelRatio)
set both backing widths/heights to rounded CSS size * DPR
set both context transforms to DPR
save { width, height, dpr }
return whether any saved size or DPR changed
```

Observe only the container. A ResizeObserver callback calls `syncCanvasSize()` then `invalidateBase()`.

- [ ] **Step 3: Implement one-shot coalescing schedulers**

Use nullable IDs:

```ts
let baseFrameId: number | null = null
let overlayFrameId: number | null = null
```

`invalidateBase` returns early when a base ID already exists. Its callback clears the ID, checks `disposed`, synchronizes DPR if necessary, creates and stores the latest frame model, draws the base, then calls `invalidateOverlay`.

`invalidateOverlay` returns early when an overlay ID already exists. Its callback clears the ID, checks `disposed`, synchronizes DPR if necessary, and draws the transparent overlay from `frameModelRef.current` and `pointerRef.current`.

Neither callback schedules itself.

- [ ] **Step 4: Route pointer events only through the overlay**

On `pointermove`, translate `clientX/clientY` against the overlay bounds, set `isInside: true`, detect DPR changes via `syncCanvasSize()`, and invalidate the base only when size/DPR changed; otherwise invalidate only the overlay.

On `pointerleave`, preserve x/y, set `isInside: false`, and invalidate only the overlay.

- [ ] **Step 5: Initialize and clean up every resource**

After registering listeners and ResizeObserver, call `syncCanvasSize()`, assign the scheduler functions to both invalidation refs, and call `invalidateBase()` once.

Cleanup must set `disposed`, cancel each non-null frame ID, disconnect the observer, remove both pointer listeners, and replace both invalidation refs with no-op functions.

- [ ] **Step 6: Run tests, lint, and build**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build && git diff --check`

Expected: all commands exit 0.

---

### Task 4: Mount Two Canvas Layers and Remove the Old Renderer

**Files:**
- Modify: `src/features/custom-canvas/CustomCanvasChart.tsx`
- Modify: `src/features/custom-canvas/customCanvas.css`
- Delete: `src/features/custom-canvas/engine/drawFrame.ts`
- Delete: `src/features/custom-canvas/hooks/useCanvasRenderer.ts`

**Interfaces:**
- Consumes: `useDualCanvasRenderer` from Task 3.
- Produces: one semantic chart container with exactly two visual Canvas layers.

- [ ] **Step 1: Render and connect both Canvas elements**

Create `containerRef`, `baseCanvasRef`, and `overlayCanvasRef`. Call:

```ts
useDualCanvasRenderer(
  containerRef,
  baseCanvasRef,
  overlayCanvasRef,
  candles,
  visibleCount,
)
```

Render a `role="img"` wrapper with the existing aria label, two `aria-hidden="true"` canvases, and a `.sr-only` fallback description.

- [ ] **Step 2: Stack the layers and route input**

```css
.custom-canvas-frame { position: relative; }
.custom-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.custom-canvas-base { pointer-events: none; }
.custom-canvas-overlay { cursor: crosshair; touch-action: none; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
```

- [ ] **Step 3: Prove the old chain is unused before deleting it**

Run:

```bash
rg -n "useCanvasRenderer|drawFrame" src
```

Expected: matches exist only inside the two old files. Delete those files with `apply_patch`, then repeat the search and expect no matches.

- [ ] **Step 4: Run all static verification**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build && git diff --check`

Expected: all commands exit 0.

---

### Task 5: Browser Invalidation Verification

**Files:**
- Temporary test: `/private/tmp/react_canvas_dual_e2e.mjs`
- Screenshot: `/private/tmp/react-canvas-dual.png`

**Interfaces:**
- Verifies actual layer separation, redraw counts, DPR sizing, pointer behavior, and cleanup-visible behavior.

- [ ] **Step 1: Instrument each Canvas independently**

Before application code loads, wrap `CanvasRenderingContext2D.clearRect`, `fillText`, and `fillRect`. Key counters by `this.canvas.classList.contains('custom-canvas-base')` versus overlay. Reset no counters automatically; maintain cumulative counts so idle deltas can be compared.

- [ ] **Step 2: Verify initial structure and idle behavior**

Assert exactly two canvases exist, their CSS/backing sizes match at DPR=2, and base text includes price/time labels. After initial settling, record both clear counters, wait 400ms while feed is paused and pointer is stationary, then assert neither counter changed.

- [ ] **Step 3: Verify pointer invalidates only overlay**

Scroll the Canvas into view, move the pointer inside the plot, and assert overlay clear count increases while base clear count remains unchanged. Confirm overlay text contains OHLC. Move outside and assert overlay clears once more and OHLC disappears.

- [ ] **Step 4: Verify data invalidates base and synchronizes overlay**

Click Start, record counts, wait until a tick changes Close, then assert base clear count increased and overlay also redrew from the updated frame model. Click Pause, settle, and confirm both layers become idle again.

- [ ] **Step 5: Verify responsive DPR and final state**

Resize the viewport, assert both layers still share CSS size and backing size equals CSS size multiplied by two, interact again to verify alignment, capture the screenshot, and assert no browser console errors.

- [ ] **Step 6: Run fresh completion verification**

Run:

```bash
npm run test:run
npm run lint -- --no-cache
npm run build
git diff --check
git status --short
```

Expected: all commands exit 0; only the dual-Canvas design, plan, implementation, and tests appear as changes.
