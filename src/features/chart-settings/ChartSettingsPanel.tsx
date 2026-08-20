import {
  CANDLE_INTERVAL_OPTIONS,
  TICK_INTERVAL_OPTIONS,
  VOLATILITY_OPTIONS,
  WINDOW_OPTIONS,
} from './chartSettings'
import type { VolatilityMode } from '../../domain/market/volatility'

interface ChartSettingsPanelProps {
  candleIntervalMs: number
  tickIntervalMs: number
  windowMs: number
  volatilityMode: VolatilityMode
  onCandleIntervalChange: (value: number) => void
  onTickIntervalChange: (value: number) => void
  onWindowChange: (value: number) => void
  onVolatilityModeChange: (value: VolatilityMode) => void
}

interface SettingGroupProps<T extends string | number> {
  label: string
  value: T
  options: readonly { label: string; value: T }[]
  onChange: (value: T) => void
}

function SettingGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SettingGroupProps<T>) {
  return (
    <fieldset className="setting-group">
      <legend>{label}</legend>
      <div className="setting-options">
        {options.map((option) => {
          const selected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'selected' : ''}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function ChartSettingsPanel({
  candleIntervalMs,
  tickIntervalMs,
  windowMs,
  volatilityMode,
  onCandleIntervalChange,
  onTickIntervalChange,
  onWindowChange,
  onVolatilityModeChange,
}: ChartSettingsPanelProps) {
  return (
    <section className="chart-settings" aria-label="图表参数">
      <div className="settings-heading">
        <span>LIVE CONFIG</span>
        <p>周期切换会重建行情；Tick 与窗口即时生效</p>
      </div>

      <div className="settings-grid">
        <SettingGroup
          label="K线周期"
          value={candleIntervalMs}
          options={CANDLE_INTERVAL_OPTIONS}
          onChange={onCandleIntervalChange}
        />
        <SettingGroup
          label="Tick频率"
          value={tickIntervalMs}
          options={TICK_INTERVAL_OPTIONS}
          onChange={onTickIntervalChange}
        />
        <SettingGroup
          label="可视窗口"
          value={windowMs}
          options={WINDOW_OPTIONS}
          onChange={onWindowChange}
        />
        <SettingGroup
          label="波动档位"
          value={volatilityMode}
          options={VOLATILITY_OPTIONS}
          onChange={onVolatilityModeChange}
        />
      </div>
    </section>
  )
}
