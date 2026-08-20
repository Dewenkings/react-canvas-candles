# Custom Canvas Phase Two Design

## Purpose

Phase two adds the first custom candlestick renderer on top of the simulated
OHLC feed from phase one. Its purpose is to make the complete data-to-pixel
pipeline understandable before introducing rendering optimizations.

The implementation deliberately uses one Canvas, a continuous
`requestAnimationFrame` loop, and full-frame redraws. Crosshair interaction,
multiple Canvas layers, dirty flags, panning, zooming, and third-party chart
libraries remain out of scope.

## Responsibility Split

The repository scaffolding will provide the React and browser lifecycle:

- Canvas component and styling
- `ResizeObserver` integration
- device-pixel-ratio backing-store setup
- continuous animation-frame scheduling and cleanup
- engine types and failing mathematical tests
- temporary fallback rendering so the application remains usable

The learner will implement the core chart reasoning:

- visible-candle selection
- automatic price range
- X/Y coordinate mapping
- grid drawing
- candlestick drawing
- final frame composition

## Directory Structure

```text
src/features/custom-canvas/
├── CustomCanvasChart.tsx
├── customCanvas.css
├── hooks/
│   └── useCanvasRenderer.ts
└── engine/
    ├── types.ts
    ├── visibleCandles.ts
    ├── visibleCandles.test.ts
    ├── priceRange.ts
    ├── priceRange.test.ts
    ├── scales.ts
    ├── scales.test.ts
    ├── drawGrid.ts
    ├── drawCandles.ts
    └── drawFrame.ts
```

## Data Flow

```text
App
→ useSimulatedFeed
→ Candle[]
→ CustomCanvasChart
→ useCanvasRenderer
→ requestAnimationFrame
→ drawFrame
    → getVisibleCandles
    → calculatePriceRange
    → createChartScales
    → drawGrid
    → drawCandles
→ Canvas
```

React owns feed state and the Canvas lifecycle. The engine owns chart math and
drawing. No engine module imports React or reads DOM state directly.

## Engine Contracts

### Visible candles

`getVisibleCandles(candles, maxVisible)` returns the last `maxVisible` items.
The default view contains 80 candles. When fewer are available, it returns all
of them; an empty input returns an empty array. The input is never mutated.

### Price range

`calculatePriceRange(candles)` returns `{ min, max }` or `null` for an empty
input. It finds the lowest `low` and highest `high`, then adds five percent of
the raw range to both ends. For a flat range, each side receives
`max(abs(price) * 0.01, 1)` so that Y-scale division never uses a zero span.

### Plot rectangle

Drawing uses CSS-pixel coordinates and reserves these insets:

```text
top: 20px
right: 64px
bottom: 28px
left: 12px
```

The remaining area is the `PlotRect` used by all scale and drawing functions.

### Scales

`createChartScales` receives the candle count, price range, and plot rectangle.
It returns `toX`, `toY`, `candleStep`, and `candleBodyWidth`.

- Each candle is centered in an equal-width horizontal slot.
- Body width is 65 percent of the slot, with a minimum of one CSS pixel.
- The maximum price maps to the plot top.
- The minimum price maps to the plot bottom.
- Higher prices therefore produce smaller Canvas Y coordinates.

## Drawing Rules

The Canvas uses a fixed logical height of 420 CSS pixels and fills its
container width.

`drawGrid` draws five horizontal grid lines, six vertical grid lines, and
price labels in the reserved right inset. Complex time-axis text is deferred.

`drawCandles` draws a high-to-low wick and an open-to-close body for every
visible candle. A close greater than or equal to open uses the rising color; a
lower close uses the falling color. A doji body remains at least one CSS pixel
high.

Default colors:

```text
background: #111827
grid: #253047
rising: #22c55e
falling: #ef4444
axis text: #94a3b8
```

## React and Canvas Lifecycle

`CustomCanvasChart` receives `candles`, owns the Canvas ref, invokes
`useCanvasRenderer`, and contains no chart math.

`useCanvasRenderer` observes the rendered Canvas size, stores the latest
candle array in a ref, configures the 2D context, and runs a continuous
animation loop. The backing store uses `cssSize * devicePixelRatio`, while
engine functions continue working in CSS pixels through
`context.setTransform(dpr, 0, 0, dpr, 0, 0)`.

Every frame reads the latest candles from the ref and calls `drawFrame`.
React state is not updated inside the animation loop. Cleanup cancels the
scheduled frame and disconnects the observer. React Strict Mode must not leave
duplicate animation loops or observers.

The continuous loop is intentionally inefficient. A later phase will measure
idle work and replace it with layered Canvas rendering and invalidation.

## Scaffold Behavior

The initial scaffold remains runnable while learner-owned functions are
unfinished:

- Math files export the final signatures and initially throw explicit
  not-implemented errors when their tests invoke them.
- Math tests initially fail to provide the implementation sequence.
- Drawing functions contain typed stub bodies without finished chart logic.
- `drawFrame` initially clears the Canvas, paints the background, and displays
  a waiting-for-engine message without calling unfinished math functions.
- App mounts the fallback Canvas beneath the phase-one feed controls.

After the math tests pass, drawing functions are implemented in this order:
grid, candles, then frame composition.

## Testing and Acceptance

Automated tests cover:

- last-80 selection, short input, empty input, and immutability
- high/low discovery, five-percent padding, flat ranges, and empty ranges
- centered X coordinates, top/bottom Y endpoints, midpoint Y mapping, candle
  step, and minimum body width

Manual browser verification covers:

- one responsive Canvas with a 420-pixel logical height
- clear rendering on DPR screens
- visible grid, wicks, and candle bodies
- latest candle changing while the feed runs
- a new candle appearing after one simulated minute
- continuous rendering while the feed is paused
- correct resizing and complete observer/animation-frame cleanup

Phase two is complete when all math tests, the existing feed tests, lint, and
the production build pass, and the manual browser checks succeed.
