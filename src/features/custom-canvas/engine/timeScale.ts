import type { PlotRect } from './types'

export interface TimeScaleState {
  barSpacing: number
  rightOffset: number
}

export interface VisibleLogicalRange {
  from: number
  to: number
  logicalFrom: number
  logicalTo: number
}

export const DEFAULT_RIGHT_OFFSET = 0.5

const MIN_BAR_SPACING = 2
const MIN_VISIBLE_BARS = 1
const REALTIME_EPSILON = 0.001

interface TimeScaleGeometryInput {
  dataLength: number
  plotWidth: number
  state: TimeScaleState
}

interface CoordinateToLogicalInput {
  x: number
  plotRect: PlotRect
  dataLength: number
  state: TimeScaleState
}

interface ZoomTimeScaleInput extends CoordinateToLogicalInput {
  zoomFactor: number
}

interface PanTimeScaleInput extends TimeScaleGeometryInput {
  deltaX: number
}

interface AdjustTimeScaleForDataAppendInput
  extends TimeScaleGeometryInput {
  appendedCount: number
}

export function createTimeScaleState(
  plotWidth: number,
  visibleCount: number,
): TimeScaleState {
  const safeVisibleCount = Math.max(1, Math.floor(visibleCount))
  const requestedSpacing = plotWidth / safeVisibleCount

  return {
    barSpacing: clampBarSpacing(requestedSpacing, plotWidth),
    rightOffset: DEFAULT_RIGHT_OFFSET,
  }
}

export function getVisibleLogicalRange(
  input: TimeScaleGeometryInput,
): VisibleLogicalRange {
  const { dataLength, plotWidth, state } = input

  if (dataLength <= 0 || plotWidth <= 0 || state.barSpacing <= 0) {
    return { from: 0, to: 0, logicalFrom: 0, logicalTo: 0 }
  }

  const logicalTo = dataLength - 1 + state.rightOffset
  const logicalFrom = logicalTo - plotWidth / state.barSpacing

  return {
    from: Math.max(0, Math.floor(logicalFrom + 0.5)),
    to: Math.min(dataLength, Math.ceil(logicalTo + 0.5)),
    logicalFrom,
    logicalTo,
  }
}

export function coordinateToLogical(
  input: CoordinateToLogicalInput,
): number {
  const { x, plotRect, dataLength, state } = input
  const distanceFromRight = plotRect.left + plotRect.width - x

  return (
    dataLength -
    1 +
    state.rightOffset -
    distanceFromRight / state.barSpacing
  )
}

export function zoomTimeScaleAtCoordinate(
  input: ZoomTimeScaleInput,
): TimeScaleState {
  const { state, x, plotRect, dataLength, zoomFactor } = input
  const anchorBefore = coordinateToLogical(input)
  const barSpacing = clampBarSpacing(
    state.barSpacing * Math.max(0.01, zoomFactor),
    plotRect.width,
  )
  const spacingOnlyState = { ...state, barSpacing }
  const anchorAfter = coordinateToLogical({
    x,
    plotRect,
    dataLength,
    state: spacingOnlyState,
  })

  return clampTimeScaleState({
    state: {
      barSpacing,
      rightOffset: state.rightOffset + anchorBefore - anchorAfter,
    },
    plotWidth: plotRect.width,
    dataLength,
  })
}

export function panTimeScale(
  input: PanTimeScaleInput,
): TimeScaleState {
  const { state, deltaX, plotWidth, dataLength } = input

  return clampTimeScaleState({
    state: {
      ...state,
      rightOffset: state.rightOffset - deltaX / state.barSpacing,
    },
    plotWidth,
    dataLength,
  })
}

export function adjustTimeScaleForDataAppend(
  input: AdjustTimeScaleForDataAppendInput,
): TimeScaleState {
  const { state, appendedCount, plotWidth, dataLength } = input
  const followsRealtime =
    state.rightOffset >= DEFAULT_RIGHT_OFFSET - REALTIME_EPSILON

  return clampTimeScaleState({
    state: {
      ...state,
      rightOffset: followsRealtime
        ? DEFAULT_RIGHT_OFFSET
        : state.rightOffset - Math.max(0, appendedCount),
    },
    plotWidth,
    dataLength,
  })
}

type ClampTimeScaleStateInput = TimeScaleGeometryInput

export function clampTimeScaleState(
  input: ClampTimeScaleStateInput,
): TimeScaleState {
  const { state, plotWidth, dataLength } = input
  const barSpacing = clampBarSpacing(state.barSpacing, plotWidth)
  const visibleBars = plotWidth > 0 ? plotWidth / barSpacing : 0
  const oldestOffset =
    visibleBars - Math.max(0, dataLength - 1) - DEFAULT_RIGHT_OFFSET
  const minRightOffset = Math.min(DEFAULT_RIGHT_OFFSET, oldestOffset)

  return {
    barSpacing,
    rightOffset: Math.min(
      DEFAULT_RIGHT_OFFSET,
      Math.max(minRightOffset, state.rightOffset),
    ),
  }
}

function clampBarSpacing(barSpacing: number, plotWidth: number): number {
  const maxBarSpacing = Math.max(
    MIN_BAR_SPACING,
    plotWidth / MIN_VISIBLE_BARS,
  )

  return Math.min(
    maxBarSpacing,
    Math.max(MIN_BAR_SPACING, barSpacing),
  )
}
