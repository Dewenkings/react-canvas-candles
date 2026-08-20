// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
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

  it('announces feed state and labels the custom chart count as a default window', () => {
    render(<App />)

    expect(screen.getByRole('status').textContent).toBe('已暂停')
    expect(screen.getByText(/默认窗口 1 bars/)).toBeTruthy()
  })
})
