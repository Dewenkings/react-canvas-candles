import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Candle } from '../../../domain/candles/types'
import { createChartFrameModel } from '../engine/createChartFrameModel'
import { drawBaseFrame } from '../engine/drawBaseFrame'
import { drawOverlayFrame } from '../engine/drawOverlayFrame'
import type {
  ChartFrameModel,
  PointerState,
} from '../engine/types'

interface CanvasSize {
  width: number
  height: number
  dpr: number
}

const noOp = () => undefined

export function useDualCanvasRenderer(
  containerRef: RefObject<HTMLDivElement | null>,
  baseCanvasRef: RefObject<HTMLCanvasElement | null>,
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>,
  candles: readonly Candle[],
  visibleCount: number,
): void {
  const candlesRef = useRef(candles)
  const visibleCountRef = useRef(visibleCount)
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    isInside: false,
  })
  const frameModelRef = useRef<ChartFrameModel | null>(null)
  const invalidateBaseRef = useRef<() => void>(noOp)
  const invalidateOverlayRef = useRef<() => void>(noOp)

  useEffect(() => {
    candlesRef.current = candles
    invalidateBaseRef.current()
  }, [candles])

  useEffect(() => {
    visibleCountRef.current = visibleCount
    invalidateBaseRef.current()
  }, [visibleCount])

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
          visibleCount: visibleCountRef.current,
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
      pointerRef.current = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        isInside: true,
      }

      if (syncCanvasSize()) {
        invalidateBase()
      } else {
        invalidateOverlay()
      }
    }

    const handlePointerLeave = () => {
      pointerRef.current = {
        ...pointerRef.current,
        isInside: false,
      }
      invalidateOverlay()
    }

    const observer = new ResizeObserver(() => {
      syncCanvasSize()
      invalidateBase()
    })

    overlayCanvas.addEventListener('pointermove', handlePointerMove)
    overlayCanvas.addEventListener('pointerleave', handlePointerLeave)
    observer.observe(container)
    syncCanvasSize()
    invalidateBaseRef.current = invalidateBase
    invalidateOverlayRef.current = invalidateOverlay
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
      overlayCanvas.removeEventListener('pointerleave', handlePointerLeave)
      invalidateBaseRef.current = noOp
      invalidateOverlayRef.current = noOp
    }
  }, [baseCanvasRef, containerRef, overlayCanvasRef])
}
