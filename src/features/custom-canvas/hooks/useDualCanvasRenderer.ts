import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Candle } from '../../../domain/candles/types'
import {
  createChartFrameModel,
  getChartPlotRect,
} from '../engine/createChartFrameModel'
import { drawBaseFrame } from '../engine/drawBaseFrame'
import { drawOverlayFrame } from '../engine/drawOverlayFrame'
import {
  adjustTimeScaleForDataAppend,
  clampTimeScaleState,
  createTimeScaleState,
  panTimeScale,
  zoomTimeScaleAtCoordinate,
} from '../engine/timeScale'
import type { TimeScaleState } from '../engine/timeScale'
import { getWheelZoomFactor } from '../engine/wheelZoom'
import type {
  ChartFrameModel,
  PointerState,
} from '../engine/types'

interface CanvasSize {
  width: number
  height: number
  dpr: number
}

interface DragState {
  pointerId: number
  startX: number
  startTimeScale: TimeScaleState
}

const noOp = () => undefined

export function useDualCanvasRenderer(
  containerRef: RefObject<HTMLDivElement | null>,
  baseCanvasRef: RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
  resetVersion: number,
): void {
  const candlesRef = useRef(candles)
  const visibleCountRef = useRef(visibleCount)
  const previousCandleCountRef = useRef(candles.length)
  const timeScaleRef = useRef<TimeScaleState>(
    createTimeScaleState(0, visibleCount),
  )
  const plotWidthRef = useRef(0)
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    isInside: false,
  })
  const frameModelRef = useRef<ChartFrameModel | null>(null)
  const invalidateBaseRef = useRef<() => void>(noOp)
  const invalidateOverlayRef = useRef<() => void>(noOp)
  const resetTimeScaleRef = useRef<() => void>(noOp)

  useEffect(() => {
    const previousCount = previousCandleCountRef.current
    candlesRef.current = candles

    if (candles.length > previousCount && plotWidthRef.current > 0) {
      timeScaleRef.current = adjustTimeScaleForDataAppend({
        state: timeScaleRef.current,
        appendedCount: candles.length - previousCount,
        plotWidth: plotWidthRef.current,
        dataLength: candles.length,
      })
    } else if (candles.length < previousCount) {
      resetTimeScaleRef.current()
    }

    previousCandleCountRef.current = candles.length
    invalidateBaseRef.current()
  }, [candles])

  useEffect(() => {
    visibleCountRef.current = visibleCount
    resetTimeScaleRef.current()
  }, [visibleCount])

  useEffect(() => {
    resetTimeScaleRef.current()
  }, [resetVersion])

  useEffect(() => {
    const container = containerRef.current
    const baseCanvas = baseCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current

    if (!container || !baseCanvas || !overlayCanvas) {
      return
    }

    const baseContext = baseCanvas.getContext('2d')
    const overlayContext = overlayCanvas.getContext('2d')

    if (!baseContext || !overlayContext) {
      return
    }

    const baseDrawingContext: CanvasRenderingContext2D = baseContext
    const overlayDrawingContext: CanvasRenderingContext2D = overlayContext

    let disposed = false
    let baseFrameId: number | null = null
    let overlayFrameId: number | null = null
    let size: CanvasSize = { width: 0, height: 0, dpr: 1 }
    let dragState: DragState | null = null
    let timeScaleInitialized = false

    const getPlotRect = () => getChartPlotRect(size.width, size.height)

    const resetTimeScale = () => {
      const plotRect = getPlotRect()
      timeScaleRef.current = createTimeScaleState(
        plotRect.width,
        visibleCountRef.current,
      )
      invalidateBase()
    }

    const syncCanvasSize = () => {
      const bounds = baseCanvas.getBoundingClientRect()
      const nextSize: CanvasSize = {
        width: Math.max(0, bounds.width),
        height: Math.max(0, bounds.height),
        dpr: Math.max(1, window.devicePixelRatio || 1),
      }
      const backingWidth = Math.round(nextSize.width * nextSize.dpr)
      const backingHeight = Math.round(nextSize.height * nextSize.dpr)
      const changed =
        size.width !== nextSize.width ||
        size.height !== nextSize.height ||
        size.dpr !== nextSize.dpr

      for (const canvas of [baseCanvas, overlayCanvas]) {
        if (
          canvas.width !== backingWidth ||
          canvas.height !== backingHeight
        ) {
          canvas.width = backingWidth
          canvas.height = backingHeight
        }
      }

      baseDrawingContext.setTransform(
        nextSize.dpr,
        0,
        0,
        nextSize.dpr,
        0,
        0,
      )
      overlayDrawingContext.setTransform(
        nextSize.dpr,
        0,
        0,
        nextSize.dpr,
        0,
        0,
      )
      size = nextSize
      plotWidthRef.current = getChartPlotRect(
        nextSize.width,
        nextSize.height,
      ).width

      return changed
    }

    function invalidateOverlay() {
      if (disposed || overlayFrameId !== null) {
        return
      }

      overlayFrameId = window.requestAnimationFrame(() => {
        overlayFrameId = null

        if (disposed) {
          return
        }

        const currentDpr = Math.max(1, window.devicePixelRatio || 1)
        if (currentDpr !== size.dpr) {
          syncCanvasSize()
          invalidateBase()
          return
        }

        overlayDrawingContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
        drawOverlayFrame({
          context: overlayDrawingContext,
          model: frameModelRef.current,
          pointer: pointerRef.current,
          width: size.width,
          height: size.height,
        })
      })
    }

    function invalidateBase() {
      if (disposed || baseFrameId !== null) {
        return
      }

      baseFrameId = window.requestAnimationFrame(() => {
        baseFrameId = null

        if (disposed) {
          return
        }

        const currentDpr = Math.max(1, window.devicePixelRatio || 1)
        if (currentDpr !== size.dpr) {
          syncCanvasSize()
        }

        frameModelRef.current = createChartFrameModel({
          candles: candlesRef.current,
          timeScale: timeScaleRef.current,
          width: size.width,
          height: size.height,
        })
        baseDrawingContext.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
        drawBaseFrame({
          context: baseDrawingContext,
          model: frameModelRef.current,
          width: size.width,
          height: size.height,
        })
        invalidateOverlay()
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = overlayCanvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      pointerRef.current = {
        x,
        y,
        isInside: true,
      }

      if (dragState?.pointerId === event.pointerId) {
        const plotRect = getPlotRect()
        timeScaleRef.current = panTimeScale({
          state: dragState.startTimeScale,
          deltaX: x - dragState.startX,
          plotWidth: plotRect.width,
          dataLength: candlesRef.current.length,
        })
        invalidateBase()
        return
      }

      if (syncCanvasSize()) {
        timeScaleRef.current = clampTimeScaleState({
          state: timeScaleRef.current,
          plotWidth: getPlotRect().width,
          dataLength: candlesRef.current.length,
        })
        invalidateBase()
      } else {
        invalidateOverlay()
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }

      const bounds = overlayCanvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const plotRect = getPlotRect()

      if (
        x < plotRect.left ||
        x > plotRect.left + plotRect.width ||
        y < plotRect.top ||
        y > plotRect.top + plotRect.height
      ) {
        return
      }

      dragState = {
        pointerId: event.pointerId,
        startX: x,
        startTimeScale: { ...timeScaleRef.current },
      }
      overlayCanvas.setPointerCapture(event.pointerId)
      overlayCanvas.classList.add('is-dragging')
    }

    const clearDrag = (pointerId: number) => {
      if (dragState?.pointerId !== pointerId) {
        return
      }

      dragState = null
      overlayCanvas.classList.remove('is-dragging')
      invalidateOverlay()
    }

    const finishDrag = (event: PointerEvent) => {
      if (dragState?.pointerId !== event.pointerId) {
        return
      }

      if (overlayCanvas.hasPointerCapture(event.pointerId)) {
        overlayCanvas.releasePointerCapture(event.pointerId)
      }
      clearDrag(event.pointerId)
    }

    const handleLostPointerCapture = (event: PointerEvent) => {
      clearDrag(event.pointerId)
    }

    const handleWheel = (event: WheelEvent) => {
      const bounds = overlayCanvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      const plotRect = getPlotRect()

      if (
        x < plotRect.left ||
        x > plotRect.left + plotRect.width ||
        y < plotRect.top ||
        y > plotRect.top + plotRect.height
      ) {
        return
      }

      event.preventDefault()
      timeScaleRef.current = zoomTimeScaleAtCoordinate({
        state: timeScaleRef.current,
        x,
        plotRect,
        dataLength: candlesRef.current.length,
        zoomFactor: getWheelZoomFactor(
          event.deltaY,
          event.deltaMode,
          plotRect.height,
        ),
      })
      invalidateBase()
    }

    const handleDoubleClick = (event: MouseEvent) => {
      const bounds = overlayCanvas.getBoundingClientRect()
      pointerRef.current = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        isInside: true,
      }
      resetTimeScale()
    }

    const handlePointerLeave = () => {
      if (dragState) {
        return
      }

      pointerRef.current = {
        ...pointerRef.current,
        isInside: false,
      }
      invalidateOverlay()
    }

    const observer = new ResizeObserver(() => {
      const changed = syncCanvasSize()

      if (!timeScaleInitialized) {
        timeScaleRef.current = createTimeScaleState(
          getPlotRect().width,
          visibleCountRef.current,
        )
        timeScaleInitialized = true
      } else if (changed) {
        timeScaleRef.current = clampTimeScaleState({
          state: timeScaleRef.current,
          plotWidth: getPlotRect().width,
          dataLength: candlesRef.current.length,
        })
      }
      invalidateBase()
    })

    overlayCanvas.addEventListener('pointermove', handlePointerMove)
    overlayCanvas.addEventListener('pointerdown', handlePointerDown)
    overlayCanvas.addEventListener('pointerup', finishDrag)
    overlayCanvas.addEventListener('pointercancel', finishDrag)
    overlayCanvas.addEventListener(
      'lostpointercapture',
      handleLostPointerCapture,
    )
    overlayCanvas.addEventListener('pointerleave', handlePointerLeave)
    overlayCanvas.addEventListener('wheel', handleWheel, { passive: false })
    overlayCanvas.addEventListener('dblclick', handleDoubleClick)
    observer.observe(container)
    syncCanvasSize()
    timeScaleRef.current = createTimeScaleState(
      getPlotRect().width,
      visibleCountRef.current,
    )
    timeScaleInitialized = true
    invalidateBaseRef.current = invalidateBase
    invalidateOverlayRef.current = invalidateOverlay
    resetTimeScaleRef.current = resetTimeScale
    invalidateBase()

    return () => {
      disposed = true

      if (baseFrameId !== null) {
        window.cancelAnimationFrame(baseFrameId)
      }
      if (overlayFrameId !== null) {
        window.cancelAnimationFrame(overlayFrameId)
      }

      observer.disconnect()
      overlayCanvas.removeEventListener('pointermove', handlePointerMove)
      overlayCanvas.removeEventListener('pointerdown', handlePointerDown)
      overlayCanvas.removeEventListener('pointerup', finishDrag)
      overlayCanvas.removeEventListener('pointercancel', finishDrag)
      overlayCanvas.removeEventListener(
        'lostpointercapture',
        handleLostPointerCapture,
      )
      overlayCanvas.removeEventListener('pointerleave', handlePointerLeave)
      overlayCanvas.removeEventListener('wheel', handleWheel)
      overlayCanvas.removeEventListener('dblclick', handleDoubleClick)
      overlayCanvas.classList.remove('is-dragging')
      invalidateBaseRef.current = noOp
      invalidateOverlayRef.current = noOp
      resetTimeScaleRef.current = noOp
    }
  }, [baseCanvasRef, containerRef, overlayCanvasRef])
}
