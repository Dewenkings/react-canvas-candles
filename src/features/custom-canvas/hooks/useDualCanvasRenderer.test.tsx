// @vitest-environment jsdom

import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Candle } from '../../../domain/candles/types'
import { CustomCanvasChart } from '../CustomCanvasChart'

const candles: Candle[] = Array.from({ length: 12 }, (_, index) => ({
  timestamp: (index + 1) * 1_000,
  open: 100 + index,
  high: 102 + index,
  low: 99 + index,
  close: 101 + index,
  volume: 10,
}))

const historyCandles: Candle[] = Array.from(
  { length: 60 },
  (_, index) => ({
    timestamp: (index + 1) * 1_000,
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 10,
  }),
)

const frameCallbacks: FrameRequestCallback[] = []
const baseFillRects: Array<{ x: number; width: number }> = []
const baseTexts: string[] = []

function flushAnimationFrames() {
  while (frameCallbacks.length > 0) {
    frameCallbacks.shift()?.(performance.now())
  }
}

function createPointerEvent(
  type: string,
  values: Partial<PointerEvent> = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: values.pointerId ?? 1 },
    button: { value: values.button ?? 0 },
    clientX: { value: values.clientX ?? 400 },
    clientY: { value: values.clientY ?? 200 },
  })
  return event
}

beforeEach(() => {
  frameCallbacks.length = 0
  baseFillRects.length = 0
  baseTexts.length = 0
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frameCallbacks.push(callback)
    return frameCallbacks.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(
    {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 420,
      width: 800,
      height: 420,
      toJSON: () => ({}),
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      const recordsBaseDrawing = this.classList.contains(
        'custom-canvas-base',
      )

      return {
        setTransform: () => undefined,
        clearRect: () => undefined,
        fillRect: (x: number, _y: number, width: number) => {
          if (recordsBaseDrawing) {
            baseFillRects.push({ x, width })
          }
        },
        strokeRect: () => undefined,
        fillText: (text: string) => {
          if (recordsBaseDrawing) {
            baseTexts.push(text)
          }
        },
        save: () => undefined,
        restore: () => undefined,
        beginPath: () => undefined,
        closePath: () => undefined,
        rect: () => undefined,
        clip: () => undefined,
        moveTo: () => undefined,
        lineTo: () => undefined,
        stroke: () => undefined,
        setLineDash: () => undefined,
      } as unknown as CanvasRenderingContext2D
    },
  )

  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe() {
      this.callback([], this as unknown as ResizeObserver)
    }

    disconnect() {}
    unobserve() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useDualCanvasRenderer interactions', () => {
  it('clears drag state when pointer capture is unexpectedly lost', () => {
    const { container } = render(
      <CustomCanvasChart
        candles={candles}
        visibleCount={12}
        resetVersion={0}
      />,
    )
    const overlay = container.querySelector<HTMLCanvasElement>(
      '.custom-canvas-overlay',
    )!
    overlay.setPointerCapture = vi.fn()
    overlay.hasPointerCapture = vi.fn(() => false)
    overlay.releasePointerCapture = vi.fn()
    flushAnimationFrames()

    overlay.dispatchEvent(createPointerEvent('pointerdown', { pointerId: 7 }))
    expect(overlay.classList.contains('is-dragging')).toBe(true)

    overlay.dispatchEvent(
      createPointerEvent('lostpointercapture', { pointerId: 7 }),
    )

    expect(overlay.classList.contains('is-dragging')).toBe(false)
  })

  it('prevents page scrolling, zooms, and restores default spacing', () => {
    const { container, rerender } = render(
      <CustomCanvasChart
        candles={candles}
        visibleCount={12}
        resetVersion={0}
      />,
    )
    const overlay = container.querySelector<HTMLCanvasElement>(
      '.custom-canvas-overlay',
    )!
    flushAnimationFrames()
    const getBodyWidth = () =>
      baseFillRects.find(
        ({ width }) => width !== 800 && width !== 64,
      )?.width
    const initialBodyWidth = getBodyWidth()

    baseFillRects.length = 0
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 200,
      deltaY: -400,
      deltaMode: 0,
    })
    overlay.dispatchEvent(wheel)
    flushAnimationFrames()

    expect(wheel.defaultPrevented).toBe(true)
    expect(getBodyWidth()).toBeGreaterThan(initialBodyWidth!)

    baseFillRects.length = 0
    overlay.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        clientX: 400,
        clientY: 200,
      }),
    )
    flushAnimationFrames()
    expect(getBodyWidth()).toBeCloseTo(initialBodyWidth!)

    overlay.dispatchEvent(wheel)
    flushAnimationFrames()
    baseFillRects.length = 0
    rerender(
      <CustomCanvasChart
        candles={candles}
        visibleCount={12}
        resetVersion={1}
      />,
    )
    flushAnimationFrames()
    expect(getBodyWidth()).toBeCloseTo(initialBodyWidth!)
  })

  it('removes wheel interaction after StrictMode cleanup and unmount', () => {
    const { container, unmount } = render(
      <StrictMode>
        <CustomCanvasChart
          candles={candles}
          visibleCount={12}
          resetVersion={0}
        />
      </StrictMode>,
    )
    const overlay = container.querySelector<HTMLCanvasElement>(
      '.custom-canvas-overlay',
    )!
    flushAnimationFrames()

    const activeWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 200,
      deltaY: -100,
    })
    overlay.dispatchEvent(activeWheel)
    expect(activeWheel.defaultPrevented).toBe(true)

    unmount()
    const detachedWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 400,
      clientY: 200,
      deltaY: -100,
    })
    overlay.dispatchEvent(detachedWheel)

    expect(detachedWheel.defaultPrevented).toBe(false)
  })

  it('preserves rendered historical candle positions when data appends', () => {
    const { container, rerender } = render(
      <CustomCanvasChart
        candles={historyCandles}
        visibleCount={12}
        resetVersion={0}
      />,
    )
    const overlay = container.querySelector<HTMLCanvasElement>(
      '.custom-canvas-overlay',
    )!
    overlay.setPointerCapture = vi.fn()
    overlay.hasPointerCapture = vi.fn(() => false)
    overlay.releasePointerCapture = vi.fn()
    flushAnimationFrames()
    baseFillRects.length = 0

    overlay.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 9, clientX: 400 }),
    )
    overlay.dispatchEvent(
      createPointerEvent('pointermove', { pointerId: 9, clientX: 700 }),
    )
    overlay.dispatchEvent(
      createPointerEvent('pointerup', { pointerId: 9, clientX: 700 }),
    )
    flushAnimationFrames()
    const historicalRects = baseFillRects.filter(
      ({ width }) => width !== 800 && width !== 64,
    )
    const historicalTimeLabels = baseTexts.filter((text) =>
      /\d{2}:\d{2}:\d{2}/.test(text),
    ).slice(-6)

    baseFillRects.length = 0
    baseTexts.length = 0
    const appendedCandles = [
      ...historyCandles,
      {
        timestamp: 61_000,
        open: 160,
        high: 162,
        low: 159,
        close: 161,
        volume: 10,
      },
    ]
    rerender(
      <CustomCanvasChart
        candles={appendedCandles}
        visibleCount={12}
        resetVersion={0}
      />,
    )
    flushAnimationFrames()

    expect(
      baseFillRects.filter(
        ({ width }) => width !== 800 && width !== 64,
      ),
    ).toEqual(historicalRects)
    expect(
      baseTexts
        .filter((text) => /\d{2}:\d{2}:\d{2}/.test(text))
        .slice(-6),
    ).toEqual(historicalTimeLabels)
  })
})
