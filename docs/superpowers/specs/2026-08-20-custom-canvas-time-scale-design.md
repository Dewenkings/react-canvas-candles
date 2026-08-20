# Custom Canvas Time Scale Design

## Goal

Add production-style horizontal zooming and scrolling to the custom dual-Canvas candlestick chart without changing its visual design or introducing another dependency.

## Model

The time scale owns two values:

- `barSpacing`: horizontal pixels allocated to one candle.
- `rightOffset`: distance, measured in candles, between the latest candle and the plot's right edge.

The visible candle count and logical range are derived from the plot width. Logical indexes remain fractional so partially visible candles and cursor-anchored zoom stay smooth.

## Interactions

- Vertical wheel zooms around the candle under the pointer.
- Primary-button horizontal drag scrolls through history.
- Double click restores the configured visible count and returns to realtime.
- Zoom and scroll are clamped so the user cannot lose the dataset beyond either edge.
- Realtime appends follow the latest candle only when already at realtime; while viewing history, the viewport is shifted to preserve the same historical candles.

## Rendering

The existing base and overlay Canvas layers remain. Time-scale changes invalidate the base layer through the existing `requestAnimationFrame` coalescing; the overlay is redrawn afterward. The Y price range continues to auto-scale from only the visible candles.

## Out of Scope

- Kinetic scrolling
- Touch pinch zoom
- Manual Y-axis scaling
- Lazy historical loading
- Selection-box zoom

