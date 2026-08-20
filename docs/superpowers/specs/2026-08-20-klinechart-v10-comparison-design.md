# KLineChart v10 对照版设计

## 目标

在现有 Custom Canvas 和 Lightweight Charts 下方加入 KLineChart v10。三个图表共享同一个 `useSimulatedFeed` 返回的 `candles`，使用相同的周期、Tick 频率、可视窗口和波动档位。

KLineChart 面板额外展示 MA 覆盖指标和 VOL 独立 pane，用于说明完整 K 线产品与轻量金融图表、自研最小引擎的能力差异。

本阶段不接入 ECharts，不实现分页历史接口、画线工具、自定义指标或服务端行情。

## 版本与 API 边界

- 安装 `klinecharts@^10`。
- 使用 v10 的 `setDataLoader` 数据模型。
- 不使用 v9 已移除的 `applyNewData`、`updateData`、`applyMoreData` 或 `setLoadDataCallback`。
- 初始化顺序遵循官方 v10：`init → setSymbol → setPeriod → setDataLoader`。
- 卸载通过 `dispose(chart)` 完成。

## 页面结构

页面保持同页纵向展示：

```text
Live Config
→ 模拟行情与控制按钮
→ Custom Canvas
→ Lightweight Charts
→ KLineChart
```

KLineChart 面板标题标记 `TRADING TERMINAL`，说明文字突出 `DataLoader · MA overlay · VOL pane`，不宣称未经测量的性能结论。

## 数据流

```text
useSimulatedFeed
        ↓ candles
        ↓ candlesRef
KLineChart v10 DataLoader
   ├── getBars
   │     └── 返回当前完整历史 KLineData[]
   ├── subscribeBar
   │     └── 保存库提供的单根 callback
   └── unsubscribeBar
         └── 清空实时 callback

React candles 更新
   ├── 同周期最后一根变化 → callback(latestBar)
   ├── 新增一根 Candle     → callback(latestBar) + scrollToRealTime
   └── 重置/非增量变化     → chart.resetData()
```

React 仍然是行情数据的唯一所有者。KLineChart 不创建定时器、不生成 Tick，也不维护另一份可写行情数组。

## 共享同步判断

目前 `getCandleSyncMode` 位于 Lightweight Charts 功能目录，但它描述的是领域层 Candle 数组变化，而不是某个图库的行为。

实现时将其迁移到：

```text
src/domain/candles/candleSync.ts
src/domain/candles/candleSync.test.ts
```

Lightweight Charts 与 KLineChart 都使用该函数判断：

- `none`：没有 Candle 值变化。
- `update`：只更新最后一根，或只追加一根。
- `replace`：初始化、重置、数组缩短、历史 Candle 变化或一次追加多根。

图库层负责把领域判断翻译成各自 API：

```text
Lightweight Charts replace → series.setData
Lightweight Charts update  → series.update

KLineChart replace         → chart.resetData
KLineChart update          → subscribeBar callback
```

## 数据适配

KLineChart v10 的 `KLineData` 与领域 `Candle` 接近：

- timestamp 继续使用毫秒，不做除以 1000。
- open、high、low、close 和 volume 原样传递。
- 不添加 turnover；本阶段的 MA 和 VOL 不依赖 turnover。
- 数组适配保持时间顺序，不修改输入数组。

适配器提供单根与数组转换，并通过测试固定时间单位和不可变性。

## 周期适配

当前周期选项为 1s、2s、5s 和 10s，统一转换为：

```ts
{
  type: 'second',
  span: candleIntervalMs / 1000,
}
```

转换函数必须验证周期是大于零的整秒；无效输入显式抛错，避免把错误周期交给图库。

现有 `CandleWorkspace key={candleIntervalMs}` 会在周期变化时重建工作区，因此 KLineChart 会完成一次干净的 dispose/init，不在同一实例中混合两个周期的数据。

## 图表生命周期

`KLineChartPanel` 只提供 DOM 容器；`useKLineChart` 管理命令式实例：

1. 容器挂载后调用 `init(container, options)`。
2. 设置 `SIMULATED` symbol、价格精度 4、成交量精度 0。
3. 设置由当前 `candleIntervalMs` 转换得到的 period。
4. 注册 DataLoader，`getBars` 从最新 `candlesRef` 返回历史数据。
5. 创建 MA 覆盖指标：`{ name: 'MA', paneId: 'candle_pane' }`。
6. 创建独立 VOL pane。
7. KLineChart 内建的 ResizeObserver 负责 Canvas resize 和 DPR；集成层的 ResizeObserver 只重新计算 bar space。
8. 卸载时断开 ResizeObserver、清空 callback，并调用 `dispose(chart)`。

React StrictMode 下允许 effect 执行 setup → cleanup → setup；每次 setup 必须拥有独立实例和观察器，cleanup 必须幂等。

## 可视窗口

KLineChart v10 使用 `setBarSpace(space)` 控制单根 K 线占用宽度。根据容器可绘制宽度和 `visibleCount` 计算：

```text
barSpace = drawableWidth / visibleCount
```

结果限制在官方允许的 1–50 范围。可视窗口变化或容器 resize 时重新设置 bar space；新增 K 线后调用 `scrollToRealTime()` 保持跟随最新数据。

ResizeObserver 在响应式重排期间可能短暂得到零宽度。此时不调用 `setBarSpace()`，避免将瞬态零宽度钳制成 1px 后破坏库内的可视范围。KLineChart v10 已内建 resize/DPR 观察，集成层不重复调用 `chart.resize()`。

此处是近似控制可见根数，不能将它描述成精确的逻辑范围 API。轴宽、pane 布局和库内部留白会影响实际可见数量。

## 指标能力

- MA 作为主 K 线 pane 的覆盖指标，不新增第二个价格轴。
- VOL 创建为独立 pane，直接使用 Candle.volume。
- 不开放指标参数 UI，不加入 MACD、KDJ 或自定义指标。
- 指标用于展示成熟 K 线产品的内建能力，不参与自研版功能范围。

## 样式与时区

- 图表总高度使用 520px，为 VOL pane 留出空间。
- 使用深色背景、绿色上涨、红色下跌，与前两个实现保持接近。
- locale 使用 `zh-CN`。
- timezone 使用浏览器解析出的本地时区，失败时回退 `Asia/Shanghai`。
- 容器必须有明确高度，不使用 CSS transform 缩放 Canvas。

## 错误与边界行为

- `init` 未返回实例时显式抛错。
- `getBars` 对 `init` 返回当前完整数据并声明没有更多分页数据；forward/backward 返回空数组和 `more: false`。
- 实时 callback 尚未建立时，不丢弃非增量变化：通过 `resetData()` 重新触发加载。
- 空数据通过历史 callback 返回空数组，不推送 undefined 实时记录。
- 旧 Candle 或历史 Candle 变化走 reset，不尝试通过实时 callback 插入历史数据。
- dispose 后所有 React effect 更新均不得调用旧 chart 或 callback。

## 测试与验收

自动测试：

- Candle 到 KLineData 保持毫秒时间戳和全部 OHLCV 字段。
- 数组适配保持顺序且不修改输入。
- 1s、2s、5s、10s 正确映射为 second period。
- 非整秒、零值和负数周期被拒绝。
- bar space 对可视数量计算正确并限制在 1–50。
- 共享 Candle 同步判断迁移后，Lightweight Charts 测试继续通过。

浏览器验收：

- 页面同时出现三个图表面板。
- KLineChart 创建 Canvas，并显示主 K 线、MA 和 VOL pane。
- 开始后 Custom Canvas、Lightweight Charts、KLineChart 同步变化。
- 同周期 Tick 更新最后一根，跨周期新增一根。
- 暂停后三个图表停止变化。
- 重置后三个图表恢复同一批固定历史数据。
- 可视窗口变化会改变 KLineChart bar space。
- 视口缩放后容器和 Canvas 正确适配。
- 十字线、拖动和缩放可交互。
- 时间轴使用本地时区。
- 控制台没有错误或清理警告。

## 工程对照结论

本阶段应能从代码中直接解释：

```text
Custom Canvas
→ 自己管理坐标、绘制、分层和 invalidation

Lightweight Charts
→ setData / update，库管理轻量金融绘制

KLineChart v10
→ Symbol + Period + DataLoader
→ getBars / subscribeBar 模拟 REST + WebSocket 架构
→ 内置 indicator 与 pane 更接近交易终端
```
