# Custom Canvas Time Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cursor-anchored wheel zoom, horizontal history scrolling, realtime viewport preservation, and double-click reset to the custom dual-Canvas chart.

**Architecture:** Introduce a tested pure time-scale module based on `barSpacing` and `rightOffset`. Feed its derived logical range into the frame model, then let the renderer hook translate pointer events into time-scale updates and the existing invalidation pipeline into drawing.

**Tech Stack:** React 19, TypeScript 6, Canvas 2D, Vitest

**Spec:** `docs/superpowers/specs/2026-08-20-custom-canvas-time-scale-design.md`

## Global Constraints

- Preserve the existing dual-Canvas layering and visual appearance.
- Use no new runtime dependency.
- Keep viewport mathematics outside React and Canvas drawing functions.
- Coalesce redraws with the existing `requestAnimationFrame` invalidation.
- Do not add kinetic scrolling, pinch zoom, manual Y scaling, or lazy history loading.

---

### Task 1: Time-scale viewport mathematics

**Files:**
- Create: `src/features/custom-canvas/engine/timeScale.test.ts`
- Create: `src/features/custom-canvas/engine/timeScale.ts`
- Modify: `src/features/custom-canvas/engine/types.ts`

**Interfaces:**
- Produces: `TimeScaleState`, `createTimeScaleState`, `getVisibleLogicalRange`, `coordinateToLogical`, `zoomTimeScaleAtCoordinate`, `panTimeScale`, and `adjustTimeScaleForDataAppend`.

- [x] Write tests with hand-derived expectations for default spacing, fractional visible range, cursor anchoring, pan bounds, and append preservation.
- [x] Run the focused test and confirm it fails because `timeScale.ts` does not exist.
- [x] Implement the smallest pure functions that satisfy those behaviors.
- [x] Run the focused test and confirm it passes.

### Task 2: Viewport-aware frame model

**Files:**
- Modify: `src/features/custom-canvas/engine/createChartFrameModel.test.ts`
- Modify: `src/features/custom-canvas/engine/createChartFrameModel.ts`
- Modify: `src/features/custom-canvas/engine/scales.ts`
- Modify: `src/features/custom-canvas/engine/scales.test.ts`
- Modify: `src/features/custom-canvas/engine/types.ts`

**Interfaces:**
- Consumes: `TimeScaleState` and its derived logical range.
- Produces: a `ChartFrameModel` whose local candle indexes map to globally correct X coordinates.

- [x] Add a failing frame-model test proving a historical offset changes the visible slice and preserves fixed pixel spacing.
- [x] Run the focused tests and confirm the expected mismatch.
- [x] Derive the visible slice before price auto-scaling and create X scales from the logical-left boundary.
- [x] Run frame-model and scale tests until green.

### Task 3: Dual-Canvas interaction controller

**Files:**
- Modify: `src/features/custom-canvas/hooks/useDualCanvasRenderer.ts`
- Modify: `src/features/custom-canvas/CustomCanvasChart.tsx`
- Modify: `src/features/custom-canvas/customCanvas.css`

**Interfaces:**
- Consumes: pure time-scale functions from Task 1.
- Produces: wheel zoom, pointer drag, double-click reset, and realtime append behavior.

- [x] Add renderer-level tests only where an observable contract is not already protected by the pure-function tests.
- [x] Store time-scale and drag state in refs so pointer movement does not cause React renders.
- [x] Register `wheel` with `passive: false`, pointer capture lifecycle events, and `dblclick`; remove all listeners during cleanup.
- [x] Reset spacing from `visibleCount`, preserve the viewport across appends, and invalidate the base layer after changes.
- [x] Add a concise screen-reader description of the available gestures and a grabbing cursor during drag.

### Task 4: Verification

**Files:**
- Modify only files needed to fix verified regressions.

**Interfaces:**
- Consumes: completed chart interaction.
- Produces: test, lint, build, and browser evidence.

- [x] Run `npm run test:run`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Start the app and verify wheel zoom, horizontal drag, double-click reset, crosshair behavior, pause/reset, and realtime history preservation in a browser.
- [x] Review the final diff for unrelated changes and cleanup omissions.
