# Canvas 交互与波动模型设计

## 目标

在当前单 Canvas、持续 `requestAnimationFrame` 完整重绘的基线引擎上，完成一个可交互的自定义 K 线垂直切片，并为模拟行情增加可切换的波动档位。

本阶段完成：

- 时间轴标签。
- 最新价格线和右侧价格标签。
- 鼠标十字线。
- 吸附最近 K 线的时间标签和 OHLC 信息。
- `calm / normal / spiky / chaos` 四档模拟波动。

本阶段不做：

- 双 Canvas 分层。
- dirty/invalidation 按需绘制。
- 拖拽、缩放、惯性移动。
- 技术指标、画线工具和多 pane。
- 趋势状态机或历史市场拟合。

## 设计原则

1. 保留当前持续完整重绘的基线，用于后续和双 Canvas + invalidation 版本对比。
2. 波动档位只影响切换之后的 tick，不重写已有历史 K 线，不改变当前运行状态。
3. 交互状态使用 ref 保存，鼠标移动不触发 React 每帧渲染。
4. 绘图函数只接收已计算好的输入，模拟行情规则不进入 Canvas engine。

## 波动模型

### 公开类型

```ts
type VolatilityMode = 'calm' | 'normal' | 'spiky' | 'chaos'

interface VolatilityProfile {
  baseAmplitude: number
  spikeChance: number
  spikeMultiplier: number
}
```

### 档位语义

| 档位 | 基础振幅 | 尖峰概率 | 尖峰倍数 | 用途 |
| --- | ---: | ---: | ---: | --- |
| calm | 0.08% | 0% | 1 | 平稳行情 |
| normal | 0.4% | 0% | 1 | 当前默认行情 |
| spiky | 0.4% | 8% | 5 | 大部分正常，偶发急涨急跌 |
| chaos | 1.5% | 20% | 3 | 持续高波动且更常出现尖峰 |

价格变化比例：

```text
direction = randomDirection - 0.5
multiplier = randomSpike < spikeChance ? spikeMultiplier : 1
changeRatio = direction * baseAmplitude * multiplier
nextPrice = max(0.01, previousClose * (1 + changeRatio))
```

方向随机数、尖峰随机数和成交量随机数分开消费，相同 seed 与相同操作序列必须可重现。

### 切换行为

```text
用户切换波动档位
→ React 更新 volatilityMode
→ useSimulatedFeed 的定时器 effect 读取新 profile
→ 下一个 tick 使用新波动规则
→ candles 数组、当前 Candle 和 isRunning 不被重置
```

手动点击“重置”仍恢复同一组确定性历史数据；波动档位只控制重置后新产生的 tick。

## 设置面板

在现有 `LIVE CONFIG` 中新增第四组：

```text
波动档位  Calm | Normal | Spiky | Chaos
```

默认为 `normal`。使用与现有选项一致的按钮组、`aria-pressed` 状态和键盘焦点样式。桌面端设置区根据空间使用两列或四列排布，移动端保持单列。

## 坐标系增强

`ChartScales` 增加：

```ts
toPrice(y: number): number
toIndex(x: number): number
```

- `toPrice` 是 `toY` 的反向映射，用于十字线右侧价格标签。
- `toIndex` 将 Canvas X 坐标转为最近的 K 线索引，结果限制在 `[0, candleCount - 1]`。
- 十字线的 X 坐标使用 `toX(toIndex(pointerX))` 吸附到 K 线中心。
- 十字线的 Y 坐标保留鼠标实际位置，并通过 `toPrice` 显示价格。

## Canvas 交互状态

```ts
interface PointerState {
  x: number
  y: number
  isInside: boolean
}
```

`useCanvasRenderer` 负责：

- 监听 Canvas `pointermove` 和 `pointerleave`。
- 使用 `getBoundingClientRect()` 将 client 坐标转为 Canvas CSS 坐标。
- 只更新 `pointerRef`，不调用 React state setter。
- 每帧将 pointer 快照传入 `drawFrame`。
- cleanup 中移除事件监听、取消 rAF 并断开 ResizeObserver。

只有当指针处于 `plotRect` 内部时才绘制十字线。进入右侧价格轴、底部时间轴或离开 Canvas 后，十字线不显示。

## 绘制顺序

`drawFrame` 继续作为唯一帧组装入口：

```text
clear + background
→ getVisibleCandles
→ calculatePriceRange
→ createChartScales
→ drawGrid（网格 + 价格轴 + 时间轴）
→ drawCandles
→ drawLatestPrice
→ drawCrosshair（最上层）
```

### 时间轴

- 与 6 条垂直网格线对齐。
- 根据网格位置选取最近 Candle。
- 短周期显示 `HH:mm:ss`，格式化使用固定 locale 和 24 小时制。
- 标签限制在 Canvas 可见宽度内，避免左右裁切。

### 最新价格线

- 使用最后一根可见 Candle 的 `close`。
- 从 `plotRect.left` 画到 `plotRect.right`。
- 线和右侧标签使用最新 Candle 的涨跌颜色。
- 标签价格保留两位小数。

### 十字线与 hover

- 垂直线吸附最近 Candle 中心，水平线跟随鼠标 Y。
- 右侧标签显示鼠标 Y 对应价格。
- 底部标签显示被吸附 Candle 的时间。
- 左上角 OHLC 信息显示时间、O/H/L/C 和 volume。
- 信息面板在 Canvas 内绘制，不通过 React state 每次移动更新 DOM。
- 绘制前验证 pointer、可见数据和 plotRect，空数据时不进入交互绘制。

## 文件边界

### 新增

```text
src/domain/market/volatility.ts
src/domain/market/volatility.test.ts
src/features/custom-canvas/engine/drawLatestPrice.ts
src/features/custom-canvas/engine/drawCrosshair.ts
```

### 修改

```text
src/App.tsx
src/features/chart-settings/chartSettings.ts
src/features/chart-settings/ChartSettingsPanel.tsx
src/hooks/useSimulatedFeed.ts
src/features/custom-canvas/engine/types.ts
src/features/custom-canvas/engine/scales.ts
src/features/custom-canvas/engine/scales.test.ts
src/features/custom-canvas/engine/drawGrid.ts
src/features/custom-canvas/engine/drawFrame.ts
src/features/custom-canvas/hooks/useCanvasRenderer.ts
```

## 测试策略

### 波动纯函数

- calm 的最大基础变化小于 normal。
- normal 不会进入尖峰分支。
- spiky 在命中尖峰概率时使用 5 倍振幅。
- chaos 的基础振幅大于 normal，且尖峰概率更高。
- 随机输入固定时输出为可预期字面量。

### 坐标纯函数

- plot 顶部反算为最高价。
- plot 底部反算为最低价。
- 左侧第一根中心反算为索引 0。
- 右侧最后一根中心反算为最后索引。
- 绘图区外的 X 经 clamp 后不会产生越界索引。

### 浏览器验证

- 四个波动按钮可选且默认 `Normal`。
- 切换波动档位不改变 Candle 数量、当前周期和运行状态。
- Canvas 底部存在时间标签。
- 最新价格线与价格标签存在。
- 鼠标进入 plot 后出现十字线、时间标签和 OHLC 信息。
- 鼠标离开 plot 后十字线消失。
- Canvas 在 DPR=2 和容器尺寸变化后继续正确绘制。
- 浏览器控制台无错误。

## 验收标准

- 用户能在运行中切换四种波动档位，历史数据和运行状态保持不变。
- 时间轴、最新价格线、十字线和 hover OHLC 在单 Canvas 中正确显示。
- 鼠标移动不触发 React state 更新。
- 新增纯函数按 TDD 完成，全部测试、lint 和 build 通过。
- 保留单 Canvas 持续 rAF 的可观察性，为下一阶段性能重构提供对照。
