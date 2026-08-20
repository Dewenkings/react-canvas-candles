import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Candle } from '../../../domain/candles/types'
import { drawFrame } from '../engine/drawFrame'
import type { PointerState } from '../engine/types'

interface CanvasSize {
  width: number
  height: number
  dpr: number
}

export function useCanvasRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
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

  useEffect(() => {
    candlesRef.current = candles
  }, [candles])

  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    let frameId = 0
    let disposed = false
    let size: CanvasSize = { width: 0, height: 0, dpr: 1 }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointerRef.current = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        isInside: true,
      }
    }

    const handlePointerLeave = () => {
      pointerRef.current = {
        ...pointerRef.current,
        isInside: false,
      }
    }

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(0, bounds.width)
      const height = Math.max(0, bounds.height)
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const backingWidth = Math.round(width * dpr)
      const backingHeight = Math.round(height * dpr)

      if (
        canvas.width !== backingWidth ||
        canvas.height !== backingHeight
      ) {
        canvas.width = backingWidth
        canvas.height = backingHeight
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      size = { width, height, dpr }
    }

    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    resizeCanvas()

    const render = () => {
      if (disposed) {
        return
      }

      const currentDpr = Math.max(1, window.devicePixelRatio || 1)

      if (currentDpr !== size.dpr) {
        resizeCanvas()
      }

      if (size.width > 0 && size.height > 0) {
        context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
        drawFrame({
          context,
          candles: candlesRef.current,
          visibleCount: visibleCountRef.current,
          pointer: pointerRef.current,
          width: size.width,
          height: size.height,
        })
      }

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [canvasRef])
}
