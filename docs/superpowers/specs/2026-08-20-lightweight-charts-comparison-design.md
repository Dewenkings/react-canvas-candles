# Lightweight Charts 对照版设计

## 目标

在现有 Custom Canvas 下方接入 Lightweight Charts K 线图。两张图共享同一个 `useSimulatedFeed` 返回的 `candles`，从而用完全相同的行情、周期、Tick 频率、可视窗口和波动档位进行公平对照。

本阶段只接入 Lightweight Charts，不加入 KLineChart、ECharts、指标、画线工具或新的行情状态。

## 页面结构

页面继续保留一套行情控制和一份 OHLC 摘要，并按以下顺序展示：

```text
Live Config
→ 模拟行情与控制按钮
→ Custom Canvas
→ Lightweight Charts
```

两个图表同页上下展示，不使用 Tab。这样可以同时观察同一个 Tick 对自研版和成熟库的影响。

## 数据流

```text
useSimulatedFeed
        ↓ candles
        ├── CustomCanvasChart
        └── LightweightChart
                 ↓
            candleAdapter
                 ↓
       Lightweight Charts series
```

React 仍然是行情数据的唯一来源。Lightweight Charts 组件不生成行情、不维护第二份 Candle 数组，也不反向修改 React state。

## 数据适配

新增纯函数把领域模型 `Candle` 转换为 Lightweight Charts 的 `CandlestickData`：

- 项目时间戳单位是毫秒。
- Lightweight Charts 的数值时间使用 Unix 秒。
- `timestamp / 1000` 后必须得到整数秒。
- 库默认时间标签按 UTC 展示；时间轴与十字线必须使用本地时区格式化器，与页面和 Custom Canvas 保持一致。
- `open/high/low/close` 原样传递。
- `volume` 暂不绘制，因为本阶段只比较主 K 线能力。

适配器分别提供单根转换和数组转换，数组转换不修改输入数组。

## 图表生命周期

`LightweightChart` 只渲染容器；`useLightweightChart` 管理命令式图表实例：

1. 挂载时调用 `createChart(container, { autoSize: true })`。
2. 使用 v5 API `chart.addSeries(CandlestickSeries, options)` 创建系列。
3. 首次初始化调用一次 `series.setData()`。
4. 后续行情变化只调用 `series.update()` 更新或新增最后一根 K 线。
5. K 线周期改变时，现有 `CandleWorkspace` 通过 `key` 重建，因此图表也会重新初始化。
6. 可视窗口变化时调整逻辑可视范围，展示最后 `visibleCount` 根数据，不替换完整 series 数据。
7. 卸载时调用 `chart.remove()`，释放库创建的 DOM、事件和内部资源。

如果数据被重置，新的最后一根时间可能早于 series 当前最后时间。Hook 必须识别这种非增量变化并使用一次 `setData()` 重建数据，之后恢复 `update()` 增量路径。

## 样式与可访问性

- 图表高度与 Custom Canvas 保持一致，为 420px。
- 使用与自研版接近的深色背景、网格、涨跌颜色，降低视觉样式对比较的干扰。
- 标题明确标记 `MATURE LIBRARY` 和 `Lightweight Charts`。
- 提供 TradingView attribution 链接，满足官方许可要求。
- 图表区域提供可访问名称；库生成的 Canvas 和交互 DOM 由库管理。

## 错误与边界行为

- 空数据时不调用 `series.update()`。
- 容器或图表实例不存在时直接跳过更新。
- 重置、数据截断或时间倒退走 `setData()`，避免向 `update()` 传入旧时间。
- 图表创建失败不吞掉错误；开发阶段让错误显式暴露。
- 不额外实现 ResizeObserver，优先使用库的 `autoSize` 能力。

## 测试与验收

自动测试：

- 毫秒时间戳正确转换为 Unix 秒。
- OHLC 字段完整映射。
- 数组适配保持顺序且不修改输入。
- 数据更新决策能区分初始化、同周期更新、新周期追加和重置重建。

浏览器验收：

- 页面同时出现 Custom Canvas 和 Lightweight Charts。
- 两张图展示同一批 K 线。
- 点击开始后两张图同步变化。
- 同周期 Tick 不增加 K 线，跨周期后两张图都新增一根。
- 窗口设置同时影响两张图的可视数量。
- 暂停后两张图停止变化。
- 重置后两张图恢复同一批固定历史数据。
- 调整视口宽度后库图表自动适配。
- 控制台没有错误或资源清理警告。

## 工程对照结论边界

页面只呈现可观察事实，不在本阶段构建完整性能基准系统。代码结构应能清晰说明：

```text
Custom Canvas
→ 自己计算范围、坐标、分层和 invalidation

Lightweight Charts
→ React 管理生命周期和数据输入
→ 库管理坐标轴、十字线、缩放、拖动与绘制调度
```
