import {
  CANDLE_INTERVAL_OPTIONS,
  TICK_INTERVAL_OPTIONS,
  WINDOW_OPTIONS,
} from './chartSettings'

interface ChartSettingsPanelProps {
  candleIntervalMs: number
  tickIntervalMs: number
  windowMs: number
  onCandleIntervalChange: (value: number) => void
  onTickIntervalChange: (value: number) => void
  onWindowChange: (value: number) => void
}

interface SettingGroupProps {
  label: string
  value: number
  options: readonly { label: string; value: number }[]
  onChange: (value: number) => void
}

function SettingGroup({
  label,
  value,
  options,
  onChange,
}: SettingGroupProps) {
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
  onCandleIntervalChange,
  onTickIntervalChange,
  onWindowChange,
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
      </div>
    </section>
  )
}
