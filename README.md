# React Canvas Candles

一个用于学习和对比 React 实时 K 线渲染架构的实验仓库。

项目先实现最小 Canvas K 线引擎，再让四种实现消费完全相同的模拟 OHLC 数据：

```text
useSimulatedFeed
       ↓ candles
       ├── Custom Canvas
       ├── Lightweight Charts
       ├── KLineChart
       └── ECharts
```

## 四种实现

| 实现 | 数据更新方式 | 内建能力 | 适合场景 |
| --- | --- | --- | --- |
| Custom Canvas | 自己计算范围、坐标并按需绘制 | 双 Canvas、十字线、最新价格线 | 学习底层原理、特殊视觉效果 |
| Lightweight Charts | `setData` 初始化，`series.update` 增量更新 | 金融坐标轴、十字线、缩放拖动 | 轻量专业金融图表 |
| KLineChart v10 | `getBars` 历史加载，`subscribeBar` 实时推送 | MA、VOL pane、完整 K 线交互 | 指标和交易终端能力 |
| ECharts | 声明式 `setOption` 合并数据与配置 | 双 Grid、Tooltip、AxisPointer、DataZoom | 后台报表和通用可视化 |

## 可调参数

- K 线周期：1s、2s、5s、10s
- Tick 频率：50ms、100ms、300ms、1s
- 可视窗口：10s、30s、1m、5m
- 波动档位：Calm、Normal、Spiky、Chaos
- 行情控制：开始、暂停、重置

周期切换会暂停并重建固定 seed 对应的历史数据；其他设置会直接作用于当前共享行情。

## 关键调用链

### Custom Canvas

```text
React props → visible range → price range → toX/toY
→ static Canvas（网格与 K 线）
→ interaction Canvas（十字线与标签）
```

### Lightweight Charts

```text
Candles → seconds timestamp adapter
→ createChart / addSeries
→ setData / update
```

### KLineChart v10

```text
Candles → millisecond KLineData
→ Symbol + Period + DataLoader
→ getBars / subscribeBar
→ MA overlay + VOL pane
```

### ECharts

```text
Candles → [open, close, low, high]
→ Candlestick series + Volume bar series
→ setOption partial update
→ linked AxisPointer + DataZoom
```

注意 ECharts 的 K 线数据顺序是 `[open, close, low, high]`，不是领域模型中的 `open/high/low/close` 顺序。

## 本地运行

```bash
npm install
npm run dev
```

验证：

```bash
npm run test:run
npm run lint
npm run build
```

## 工程结论

```text
教学和特殊视觉效果      → Custom Canvas
专业轻量金融图表        → Lightweight Charts
完整指标与交易终端能力  → KLineChart
通用业务与多类型可视化  → ECharts
```

四套实现同页加载是为了公平对照。生产项目通常应按页面或路由懒加载实际使用的图库，避免把所有图库同时打进首屏包。

## 第一版范围

本仓库暂不实现多 pane 自研引擎、画线工具、WebGL、Worker、百万级数据、插件系统或 npm 组件发布。
