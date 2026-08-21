// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./hooks/useSimulatedFeed', () => ({
  useSimulatedFeed: () => ({
    candles: [
      {
        timestamp: 1_700_000_000_000,
        open: 100,
        high: 104,
        low: 98,
        close: 102,
        volume: 1_250,
      },
    ],
    isRunning: false,
    resetVersion: 0,
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('./features/custom-canvas/CustomCanvasChart', () => ({
  CustomCanvasChart: () => <div>custom chart</div>,
}))

vi.mock('./features/lightweight-charts/LightweightChart', () => ({
  LightweightChart: () => <div>lightweight chart</div>,
}))

vi.mock('./features/kline-chart/KLineChartPanel', () => ({
  KLineChartPanel: () => <div>kline chart</div>,
}))

vi.mock('./features/echarts/EChartsPanel', () => ({
  EChartsPanel: () => <div>echarts chart</div>,
}))

describe('App comparison workspace', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('groups the four rendering approaches in one comparison grid', () => {
    render(<App />)

    const comparison = screen.getByRole('region', {
      name: 'K 线渲染方案对比',
    })
    const headings = within(comparison)
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(comparison.classList.contains('comparison-grid')).toBe(true)
    expect(headings).toEqual([
      'Custom Canvas',
      'Lightweight Charts',
      'KLineChart',
      'ECharts',
    ])
  })

  it('uses a scrolling comparison layout so chart cards keep a readable height', () => {
    render(<App />)

    expect(screen.getByRole('main').getAttribute('data-layout')).toBe(
      'scrolling-comparison',
    )
  })

  it('groups live configuration and feed controls in one market console', () => {
    render(<App />)

    const consoleRegion = screen.getByRole('region', {
      name: '共享行情控制台',
    })

    expect(
      within(consoleRegion).getByRole('region', { name: '图表参数' }),
    ).toBeTruthy()
    expect(
      within(consoleRegion).getByRole('region', {
        name: 'Simulated Data Flow',
      }),
    ).toBeTruthy()
  })

  it('announces feed state and labels the custom chart count as a default window', () => {
    render(<App />)

    expect(screen.getByRole('status').textContent).toBe('已暂停')
    expect(screen.getByText(/默认窗口 1 bars/)).toBeTruthy()
  })

  it('keeps keyboard focus in the period controls when the feed is rebuilt', () => {
    render(<App />)

    const periodGroup = screen.getByRole('group', { name: 'K线周期' })
    const oneSecondButton = within(periodGroup).getByRole('button', {
      name: '1s',
    })

    oneSecondButton.focus()
    fireEvent.click(oneSecondButton)

    expect(document.activeElement).toBe(oneSecondButton)
    expect(oneSecondButton.getAttribute('aria-pressed')).toBe('true')
  })
})
