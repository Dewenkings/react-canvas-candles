// @vitest-environment jsdom

import { StrictMode, useRef } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Candle } from '../../domain/candles/types'

interface ChartMock {
  setOption: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const echartsMocks = vi.hoisted(() => ({
  init: vi.fn(),
  use: vi.fn(),
}))

vi.mock('echarts/core', () => echartsMocks)
vi.mock('echarts/charts', () => ({
  BarChart: {},
  CandlestickChart: {},
}))
vi.mock('echarts/components', () => ({
  AxisPointerComponent: {},
  DataZoomComponent: {},
  GridComponent: {},
  TooltipComponent: {},
}))
vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))

import { useECharts } from './useECharts'

const first: Candle = {
  timestamp: 1_000,
  open: 100,
  high: 102,
  low: 99,
  close: 101,
  volume: 10,
}

const second: Candle = {
  timestamp: 2_000,
  open: 101,
  high: 103,
  low: 100,
  close: 102,
  volume: 20,
}

const resizeObservers: ResizeObserverMock[] = []

class ResizeObserverMock {
  readonly callback: ResizeObserverCallback
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObservers.push(this)
  }
}

function createChartMock(): ChartMock {
  return {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }
}

interface HarnessProps {
  candles: readonly Candle[]
  visibleCount: number
}

function Harness({ candles, visibleCount }: HarnessProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useECharts(containerRef, candles, visibleCount)

  return <div ref={containerRef} />
}

beforeEach(() => {
  resizeObservers.length = 0
  echartsMocks.init.mockReset()
  echartsMocks.init.mockImplementation(() => createChartMock())
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useECharts', () => {
  it('keeps DataZoom while updating a same-length Candle snapshot', () => {
    const { rerender } = render(
      <Harness candles={[first, second]} visibleCount={2} />,
    )
    const chart = echartsMocks.init.mock.results[0].value as ChartMock
    const callsAfterMount = chart.setOption.mock.calls.length

    rerender(
      <Harness
        candles={[first, { ...second, close: 101.5 }]}
        visibleCount={2}
      />,
    )

    expect(chart.setOption).toHaveBeenCalledTimes(callsAfterMount + 1)
    expect(chart.setOption.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'dataZoom',
    )
  })

  it('updates DataZoom when data length or visible count changes', () => {
    const initialCandles = [first, second]
    const appendedCandles = [
      ...initialCandles,
      { ...second, timestamp: 3_000 },
    ]
    const { rerender } = render(
      <Harness candles={initialCandles} visibleCount={2} />,
    )
    const chart = echartsMocks.init.mock.results[0].value as ChartMock

    rerender(
      <Harness
        candles={appendedCandles}
        visibleCount={2}
      />,
    )
    expect(chart.setOption.mock.calls.at(-1)?.[0]).toMatchObject({
      dataZoom: [
        { id: 'inside', startValue: 1, endValue: 2 },
        { id: 'slider', startValue: 1, endValue: 2 },
      ],
    })

    rerender(
      <Harness candles={appendedCandles} visibleCount={1} />,
    )
    expect(chart.setOption.mock.calls.at(-1)?.[0]).toMatchObject({
      dataZoom: [
        { id: 'inside', startValue: 2, endValue: 2 },
        { id: 'slider', startValue: 2, endValue: 2 },
      ],
    })
  })

  it('disconnects ResizeObserver and disposes each StrictMode instance', () => {
    const { unmount } = render(
      <StrictMode>
        <Harness candles={[first, second]} visibleCount={2} />
      </StrictMode>,
    )

    expect(echartsMocks.init).toHaveBeenCalledTimes(2)
    expect(resizeObservers).toHaveLength(2)
    expect(resizeObservers[0].disconnect).toHaveBeenCalledTimes(1)
    expect(
      (echartsMocks.init.mock.results[0].value as ChartMock).dispose,
    ).toHaveBeenCalledTimes(1)

    unmount()

    expect(resizeObservers[1].disconnect).toHaveBeenCalledTimes(1)
    expect(
      (echartsMocks.init.mock.results[1].value as ChartMock).dispose,
    ).toHaveBeenCalledTimes(1)
  })
})
