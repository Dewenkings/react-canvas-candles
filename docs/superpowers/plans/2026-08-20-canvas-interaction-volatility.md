# Canvas Interaction and Volatility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable market-volatility presets, chart time labels, a latest-price line, and a pointer-driven crosshair with snapped Candle OHLC information to the existing single-Canvas baseline.

**Architecture:** Volatility remains a pure domain calculation consumed by `useSimulatedFeed`; changing it affects future ticks without remounting the feed. Canvas interaction stays outside React state: pointer events update a ref, `drawFrame` composes static and interactive draw functions every animation frame, and inverse scale functions translate pointer pixels back to price and Candle index.

**Tech Stack:** React 19, TypeScript, Canvas 2D, Vitest, ESLint, Vite, Playwright browser verification.

**Spec:** `docs/superpowers/specs/2026-08-20-canvas-interaction-volatility-design.md`

## Global Constraints

- Keep the current single Canvas and continuous `requestAnimationFrame` full-redraw baseline.
- Do not add chart libraries or npm dependencies.
- Volatility changes affect only future ticks and preserve Candle history and `isRunning`.
- Pointer movement must not update React state.
- All drawing coordinates use CSS pixels; DPR scaling stays in `useCanvasRenderer`.
- Remove pointer listeners, cancel rAF, and disconnect ResizeObserver during cleanup.
- Do not commit until the user separately authorizes add, commit, and push.

## File Map

- Create `src/domain/market/volatility.ts`: volatility types, profiles, and pure change-ratio calculation.
- Create `src/domain/market/volatility.test.ts`: deterministic profile and spike-rule tests.
- Modify `src/hooks/useSimulatedFeed.ts`: consume the selected volatility mode when producing future ticks.
- Modify `src/features/chart-settings/chartSettings.ts`: expose volatility control options.
- Modify `src/features/chart-settings/ChartSettingsPanel.tsx`: render the fourth settings group.
- Modify `src/App.tsx`: own the volatility mode and pass it into the feed workspace.
- Modify `src/features/custom-canvas/engine/types.ts`: add pointer state and inverse scale signatures.
- Modify `src/features/custom-canvas/engine/scales.ts`: implement `toPrice` and `toIndex`.
- Modify `src/features/custom-canvas/engine/scales.test.ts`: verify inverse mappings and clamping.
- Modify `src/features/custom-canvas/engine/drawGrid.ts`: render time labels aligned to vertical grid lines.
- Create `src/features/custom-canvas/engine/drawLatestPrice.ts`: render the latest-close guide and label.
- Create `src/features/custom-canvas/engine/drawCrosshair.ts`: render snapped crosshair, axis labels, and OHLC panel.
- Modify `src/features/custom-canvas/engine/drawFrame.ts`: compose the new drawing stages.
- Modify `src/features/custom-canvas/hooks/useCanvasRenderer.ts`: collect pointer coordinates in a ref and clean up listeners.
- Modify `src/features/custom-canvas/CustomCanvasChart.tsx`: expose an interaction cursor and preserve accessibility text.
- Modify `src/App.css` or `src/features/custom-canvas/customCanvas.css`: fit four setting groups and show the crosshair cursor.

---

### Task 1: Pure Volatility Model

**Files:**
- Create: `src/domain/market/volatility.test.ts`
- Create: `src/domain/market/volatility.ts`

**Interfaces:**
- Produces: `VolatilityMode`, `VolatilityProfile`, `VOLATILITY_PROFILES`, and `calculatePriceChangeRatio(mode, directionRandom, spikeRandom): number`.
- Consumes: no React or Canvas code.

- [ ] **Step 1: Write the failing profile tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  calculatePriceChangeRatio,
  VOLATILITY_PROFILES,
} from './volatility'

describe('calculatePriceChangeRatio', () => {
  it('keeps calm changes smaller than normal changes', () => {
    expect(calculatePriceChangeRatio('calm', 1, 1)).toBeCloseTo(0.0004)
    expect(calculatePriceChangeRatio('normal', 1, 1)).toBeCloseTo(0.002)
  })

  it('applies the spiky multiplier only when spikeRandom is below its chance', () => {
    expect(calculatePriceChangeRatio('spiky', 1, 0.07)).toBeCloseTo(0.01)
    expect(calculatePriceChangeRatio('spiky', 1, 0.08)).toBeCloseTo(0.002)
  })

  it('gives chaos a larger base amplitude and spike chance than normal', () => {
    expect(VOLATILITY_PROFILES.chaos.baseAmplitude).toBeGreaterThan(
      VOLATILITY_PROFILES.normal.baseAmplitude,
    )
    expect(VOLATILITY_PROFILES.chaos.spikeChance).toBeGreaterThan(
      VOLATILITY_PROFILES.normal.spikeChance,
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- src/domain/market/volatility.test.ts`

Expected: FAIL because `./volatility` is absent, then fail with an explicit not-implemented stub before implementing behavior.

- [ ] **Step 3: Implement the minimal volatility model**

```ts
export type VolatilityMode = 'calm' | 'normal' | 'spiky' | 'chaos'

export interface VolatilityProfile {
  baseAmplitude: number
  spikeChance: number
  spikeMultiplier: number
}

export const VOLATILITY_PROFILES: Record<
  VolatilityMode,
  VolatilityProfile
> = {
  calm: { baseAmplitude: 0.0008, spikeChance: 0, spikeMultiplier: 1 },
  normal: { baseAmplitude: 0.004, spikeChance: 0, spikeMultiplier: 1 },
  spiky: { baseAmplitude: 0.004, spikeChance: 0.08, spikeMultiplier: 5 },
  chaos: { baseAmplitude: 0.015, spikeChance: 0.2, spikeMultiplier: 3 },
}

export function calculatePriceChangeRatio(
  mode: VolatilityMode,
  directionRandom: number,
  spikeRandom: number,
): number {
  const profile = VOLATILITY_PROFILES[mode]
  const multiplier =
    spikeRandom < profile.spikeChance ? profile.spikeMultiplier : 1
  return (directionRandom - 0.5) * profile.baseAmplitude * multiplier
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:run -- src/domain/market/volatility.test.ts`

Expected: all volatility tests PASS.

---

### Task 2: Connect Volatility to Settings and Tick Generation

**Files:**
- Modify: `src/hooks/useSimulatedFeed.ts`
- Modify: `src/features/chart-settings/chartSettings.ts`
- Modify: `src/features/chart-settings/ChartSettingsPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `VolatilityMode` and `calculatePriceChangeRatio` from Task 1.
- Produces: a controlled `volatilityMode` setting passed to `useSimulatedFeed`.

- [ ] **Step 1: Add the feed option and consume a third deterministic random value**

Extend `SimulatedFeedOptions`:

```ts
volatilityMode: VolatilityMode
```

Within each timer tick, advance the seeded LCG three times to obtain `directionRandom`, `spikeRandom`, and `volumeRandom`, then calculate price with:

```ts
const changeRatio = calculatePriceChangeRatio(
  volatilityMode,
  directionRandom,
  spikeRandom,
)
price: Math.max(0.01, lastCandle.close * (1 + changeRatio))
```

Include `volatilityMode` in the timer effect dependency list. Do not include it in reset dependencies that regenerate history.

- [ ] **Step 2: Add typed options and the fourth control group**

In `chartSettings.ts`:

```ts
export const VOLATILITY_OPTIONS: readonly {
  label: string
  value: VolatilityMode
}[] = [
  { label: 'Calm', value: 'calm' },
  { label: 'Normal', value: 'normal' },
  { label: 'Spiky', value: 'spiky' },
  { label: 'Chaos', value: 'chaos' },
]
```

Make `SettingGroup` generic over `string | number`, then render a `波动档位` group with the same `aria-pressed` behavior.

- [ ] **Step 3: Own the mode in App without adding it to the workspace key**

```ts
const [volatilityMode, setVolatilityMode] =
  useState<VolatilityMode>('normal')
```

Pass it through `ChartSettingsPanel` and `CandleWorkspace` into `useSimulatedFeed`. Keep `key={candleIntervalMs}` unchanged so volatility changes do not remount or reset the feed.

- [ ] **Step 4: Run all existing tests, lint, and build**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build`

Expected: all commands exit 0.

---

### Task 3: Inverse Chart Scales

**Files:**
- Modify: `src/features/custom-canvas/engine/types.ts`
- Modify: `src/features/custom-canvas/engine/scales.test.ts`
- Modify: `src/features/custom-canvas/engine/scales.ts`

**Interfaces:**
- Consumes: existing `CreateChartScalesInput`.
- Produces: `ChartScales.toPrice(y): number` and `ChartScales.toIndex(x): number`.

- [ ] **Step 1: Add failing inverse-scale tests**

Using the existing fixture with `priceRange: { min: 90, max: 110 }`, `plotRect: { left: 10, top: 20, width: 400, height: 200 }`, and `candleCount: 4`, assert literal expectations:

```ts
expect(scales.toPrice(20)).toBe(110)
expect(scales.toPrice(220)).toBe(90)
expect(scales.toIndex(60)).toBe(0)
expect(scales.toIndex(360)).toBe(3)
expect(scales.toIndex(-100)).toBe(0)
expect(scales.toIndex(900)).toBe(3)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- src/features/custom-canvas/engine/scales.test.ts`

Expected: FAIL because `toPrice` and `toIndex` do not exist.

- [ ] **Step 3: Implement inverse mappings**

```ts
const toPrice = (y: number) => {
  const ratio = (y - plotRect.top) / plotRect.height
  return priceRange.max - ratio * priceSpan
}

const toIndex = (x: number) => {
  const rawIndex = Math.round((x - plotRect.left) / candleStep - 0.5)
  return Math.min(candleCount - 1, Math.max(0, rawIndex))
}
```

Return both functions from `createChartScales` and declare them in `ChartScales`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:run -- src/features/custom-canvas/engine/scales.test.ts`

Expected: all scale tests PASS.

---

### Task 4: Time Axis and Latest Price

**Files:**
- Modify: `src/features/custom-canvas/engine/drawGrid.ts`
- Create: `src/features/custom-canvas/engine/drawLatestPrice.ts`
- Modify: `src/features/custom-canvas/engine/drawFrame.ts`

**Interfaces:**
- Consumes: visible `readonly Candle[]`, `ChartScales`, `PlotRect`, and `PriceRange`.
- Produces: time labels aligned with vertical grid lines and `drawLatestPrice(input): void`.

- [ ] **Step 1: Extend `DrawGridInput` with visible candles**

Use the same six vertical ratios already used by the grid. Convert each ratio to a clamped Candle index with `Math.round(ratio * (candles.length - 1))`, then draw `HH:mm:ss` below `plotRect` using a module-level `Intl.DateTimeFormat` with `hour12: false`.

- [ ] **Step 2: Implement latest-price drawing in a focused file**

`drawLatestPrice` must:

```text
latest = candles.at(-1)
y = scales.toY(latest.close)
color = latest.close >= latest.open ? green : red
draw dashed horizontal line across plotRect
draw a filled right-axis label background
draw latest.close.toFixed(2) inside the label
restore line dash and context state
```

- [ ] **Step 3: Compose both stages in `drawFrame`**

Pass `visibleCandles` to `drawGrid`, draw Candles, then call `drawLatestPrice` so the latest guide is above the candles but below the crosshair.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build`

Expected: all commands exit 0.

---

### Task 5: Pointer Ref and Crosshair Drawing

**Files:**
- Modify: `src/features/custom-canvas/engine/types.ts`
- Create: `src/features/custom-canvas/engine/drawCrosshair.ts`
- Modify: `src/features/custom-canvas/engine/drawFrame.ts`
- Modify: `src/features/custom-canvas/hooks/useCanvasRenderer.ts`
- Modify: `src/features/custom-canvas/CustomCanvasChart.tsx`
- Modify: `src/features/custom-canvas/customCanvas.css`

**Interfaces:**
- Produces: `PointerState { x: number; y: number; isInside: boolean }` and `drawCrosshair(input): void`.
- Consumes: inverse scales from Task 3 and visible Candles from `drawFrame`.

- [ ] **Step 1: Track pointer state without React state**

Initialize:

```ts
const pointerRef = useRef<PointerState>({ x: 0, y: 0, isInside: false })
```

Inside the Canvas lifecycle effect:

```ts
const handlePointerMove = (event: PointerEvent) => {
  const bounds = canvas.getBoundingClientRect()
  pointerRef.current = {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    isInside: true,
  }
}

const handlePointerLeave = () => {
  pointerRef.current = { ...pointerRef.current, isInside: false }
}
```

Register both listeners before rAF starts and remove both in cleanup.

- [ ] **Step 2: Implement `drawCrosshair`**

Return immediately unless the pointer lies inside `plotRect`. Otherwise:

```ts
index = scales.toIndex(pointer.x)
candle = candles[index]
snappedX = scales.toX(index)
price = scales.toPrice(pointer.y)
```

Draw in this order:

1. dashed vertical line at `snappedX` and horizontal line at `pointer.y`;
2. right-axis price label with `price.toFixed(2)`;
3. bottom time label using the snapped Candle timestamp;
4. a translucent top-left panel containing time, `O`, `H`, `L`, `C`, and `V` values.

Wrap all context mutations in `save()` / `restore()`.

- [ ] **Step 3: Pass the pointer snapshot through `drawFrame`**

Add `pointer: PointerState` to `DrawFrameInput`, pass `pointerRef.current` from the rAF callback, and invoke `drawCrosshair` after `drawLatestPrice`.

- [ ] **Step 4: Add interaction affordance and verify cleanup**

Set `.custom-canvas { cursor: crosshair; touch-action: none; }`. Confirm cleanup removes listeners in addition to the existing rAF and ResizeObserver cleanup.

- [ ] **Step 5: Run tests, lint, and build**

Run: `npm run test:run && npm run lint -- --no-cache && npm run build && git diff --check`

Expected: all commands exit 0 with no whitespace errors.

---

### Task 6: Browser Integration Verification

**Files:**
- Temporary test only: `/private/tmp/react_canvas_interaction_e2e.mjs`
- Screenshot output: `/private/tmp/react-canvas-interaction.png`

**Interfaces:**
- Verifies the real React app, Canvas 2D calls, pointer behavior, and settings behavior.

- [ ] **Step 1: Start the local app**

Run: `npm run dev -- --host 127.0.0.1`

- [ ] **Step 2: Instrument Canvas and verify the initial frame**

Before page code loads, wrap `fillText`, `stroke`, and `setLineDash` to record frame events. Assert that recorded text contains several `HH:mm:ss` labels and the latest close label, with no browser console errors.

- [ ] **Step 3: Verify volatility switching preserves state**

Start the feed, capture Candle count and running status, select `Chaos`, and assert:

```text
status remains 运行中
Candle count is unchanged immediately after switching
Chaos has aria-pressed=true
```

- [ ] **Step 4: Verify crosshair enter and leave**

Move the pointer into the plot area. Assert the latest frame contains `O`, `H`, `L`, `C`, `V` hover text and crosshair axis labels. Move it to the right-axis area or outside the Canvas and assert hover text disappears from the next frame.

- [ ] **Step 5: Verify resize, DPR, screenshot, and final commands**

Use a DPR=2 browser context, resize the viewport, and assert Canvas backing dimensions still equal CSS dimensions multiplied by two. Save the screenshot, then run:

```bash
npm run test:run
npm run lint -- --no-cache
npm run build
git diff --check
git status --short
```

Expected: 0 browser console errors; all automated commands exit 0; only the design, plan, and implementation files are modified or untracked.
