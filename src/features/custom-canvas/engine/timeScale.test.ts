import { describe, expect, it } from 'vitest'
import {
  adjustTimeScaleForDataAppend,
  coordinateToLogical,
  createTimeScaleState,
  getVisibleLogicalRange,
  panTimeScale,
  zoomTimeScaleAtCoordinate,
} from './timeScale'

describe('custom Canvas time scale', () => {
  it('derives the initial bar spacing from the requested visible count', () => {
    expect(createTimeScaleState(800, 80)).toEqual({
      barSpacing: 10,
      rightOffset: 0.5,
    })
  })

  it.each([
    { visibleCount: 1, expectedSpacing: 800 },
    { visibleCount: 2, expectedSpacing: 400 },
    { visibleCount: 3, expectedSpacing: 800 / 3 },
  ])(
    'honors a configured reset window of $visibleCount candles',
    ({ visibleCount, expectedSpacing }) => {
      expect(createTimeScaleState(800, visibleCount).barSpacing).toBeCloseTo(
        expectedSpacing,
      )
    },
  )

  it('keeps fractional logical edges while selecting candle centers inside the plot', () => {
    expect(
      getVisibleLogicalRange({
        dataLength: 120,
        plotWidth: 800,
        state: { barSpacing: 10, rightOffset: 0.5 },
      }),
    ).toEqual({
      from: 40,
      to: 120,
      logicalFrom: 39.5,
      logicalTo: 119.5,
    })
  })

  it('keeps a candle whose slot is partially visible at the left edge', () => {
    expect(
      getVisibleLogicalRange({
        dataLength: 10,
        plotWidth: 400,
        state: { barSpacing: 100, rightOffset: -0.75 },
      }),
    ).toMatchObject({ from: 4, to: 9 })
  })

  it('keeps a candle whose slot is partially visible at the right edge', () => {
    expect(
      getVisibleLogicalRange({
        dataLength: 10,
        plotWidth: 400,
        state: { barSpacing: 100, rightOffset: -0.25 },
      }),
    ).toMatchObject({ from: 5, to: 10 })
  })

  it('keeps the logical candle below the cursor fixed while zooming', () => {
    const plotRect = { left: 0, top: 0, width: 800, height: 400 }
    const state = { barSpacing: 10, rightOffset: 0.5 }
    const anchorBefore = coordinateToLogical({
      x: 400,
      plotRect,
      dataLength: 120,
      state,
    })

    const zoomed = zoomTimeScaleAtCoordinate({
      state,
      x: 400,
      plotRect,
      dataLength: 120,
      zoomFactor: 2,
    })

    expect(zoomed.barSpacing).toBe(20)
    expect(
      coordinateToLogical({
        x: 400,
        plotRect,
        dataLength: 120,
        state: zoomed,
      }),
    ).toBeCloseTo(anchorBefore)
  })

  it('converts a rightward drag from pixels into historical bar offset', () => {
    expect(
      panTimeScale({
        state: { barSpacing: 10, rightOffset: 0.5 },
        deltaX: 100,
        plotWidth: 800,
        dataLength: 120,
      }),
    ).toEqual({ barSpacing: 10, rightOffset: -9.5 })
  })

  it('clamps scrolling at the oldest candle and at realtime', () => {
    expect(
      panTimeScale({
        state: { barSpacing: 10, rightOffset: 0.5 },
        deltaX: 10_000,
        plotWidth: 800,
        dataLength: 120,
      }).rightOffset,
    ).toBe(-39.5)

    expect(
      panTimeScale({
        state: { barSpacing: 10, rightOffset: -10 },
        deltaX: -10_000,
        plotWidth: 800,
        dataLength: 120,
      }).rightOffset,
    ).toBe(0.5)
  })

  it('follows appends at realtime but preserves a historical viewport', () => {
    expect(
      adjustTimeScaleForDataAppend({
        state: { barSpacing: 10, rightOffset: 0.5 },
        appendedCount: 2,
        plotWidth: 800,
        dataLength: 122,
      }),
    ).toEqual({ barSpacing: 10, rightOffset: 0.5 })

    expect(
      adjustTimeScaleForDataAppend({
        state: { barSpacing: 10, rightOffset: -10 },
        appendedCount: 2,
        plotWidth: 800,
        dataLength: 122,
      }),
    ).toEqual({ barSpacing: 10, rightOffset: -12 })
  })
})
