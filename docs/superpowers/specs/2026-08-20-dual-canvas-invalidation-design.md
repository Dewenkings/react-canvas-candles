# 双 Canvas 与 Invalidation 按需绘制设计

## 目标

将当前“单 Canvas + 持续 `requestAnimationFrame` + 每帧完整重绘”重构为：

```text
CustomCanvasChart
├── 底层 Canvas
│   └── 背景、网格、时间轴、K 线、最新价格线
└── 顶层 Canvas
    └── 十字线、价格/时间标签、hover OHLC
```

两层都不运行永久 rAF 循环，只在对应状态变化时请求一帧，并将同一帧内的多次失效合并。

## 范围

本阶段完成：

- 两个尺寸完全一致、绝对叠放的 Canvas。
- 底层静态内容与顶层交互内容分离。
- 共享可见 Candle、价格范围、plotRect 和 scales 的帧模型。
- 底层和顶层独立 invalidation 调度器。
- 数据、可见窗口、DPR 或容器尺寸变化时重绘底层。
- 指针移动或离开时只重绘顶层。
- 底层重绘后使顶层失效，保证十字线使用最新坐标模型。
- cleanup 正确取消未执行帧并移除观察器和事件。

本阶段不做：

- 拖拽、缩放、惯性移动。
- OffscreenCanvas、Worker 或 WebGL。
- 按局部矩形刷新的 dirty-region 算法。
- 缓存单根 Candle 的 bitmap。
- 改变现有行情、波动和窗口配置语义。

## DOM 与可访问性

```tsx
<div
  className="custom-canvas-frame"
  role="img"
  aria-label="Custom candlestick chart learning canvas"
>
  <canvas className="custom-canvas custom-canvas-base" aria-hidden="true" />
  <canvas className="custom-canvas custom-canvas-overlay" aria-hidden="true" />
</div>
```

- 容器作为语义上的图像，避免读屏软件把两层读成两张图。
- 两层 Canvas 均使用 `position: absolute; inset: 0` 填满容器。
- 底层 `pointer-events: none`，顶层接收 `pointermove` 和 `pointerleave`。
- 顶层保持 `cursor: crosshair` 和 `touch-action: none`。
- Canvas fallback 文本放在容器附近的隐藏辅助文本中，不依赖两个 Canvas 的子文本。

## 共享帧模型

当前 `drawFrame` 同时承担数据筛选、布局计算和所有绘制。重构后抽出纯组装边界：

```ts
interface ChartFrameModel {
  visibleCandles: readonly Candle[]
  priceRange: PriceRange
  plotRect: PlotRect
  scales: ChartScales
}

interface CreateChartFrameModelInput {
  candles: readonly Candle[]
  visibleCount: number
  width: number
  height: number
}

function createChartFrameModel(
  input: CreateChartFrameModelInput,
): ChartFrameModel | null
```

返回 `null` 的情况：

- 可见 Candle 为空。
- 绘图区宽或高为零。
- 无法得到价格范围。

帧模型只由底层失效时重新计算，并保存到 `frameModelRef`。顶层直接读取同一个模型，不重复计算 visible range、price range 或 scales。

## 绘制边界

### `drawBaseFrame`

输入：底层 context、帧模型、CSS width/height。

顺序：

```text
clearRect
→ 背景色
→ drawGrid
→ drawCandles
→ drawLatestPrice
```

空数据时，底层负责背景和 `No candle data` 文本。

### `drawOverlayFrame`

输入：顶层 context、帧模型或 `null`、pointer、CSS width/height。

顺序：

```text
clearRect（始终执行，保证 pointerleave 清除旧十字线）
→ model 为 null 时返回
→ drawCrosshair
```

顶层 Canvas 保持透明，不绘制背景、网格或 K 线。

### 时间标签碰撞

时间轴属于底层，不能在鼠标每次移动时重画来隐藏冲突标签。因此双层版改为：

- 底层始终绘制全部固定时间刻度，不依赖 pointer。
- 顶层先在时间轴区域绘制与底色一致的宽遮罩，覆盖与 hover 标签冲突的固定刻度。
- 再在遮罩中央绘制紧凑的不透明 hover 时间标签。
- 遮罩和 hover 标签都属于顶层，不为隐藏刻度而使底层失效。

## Invalidation 调度器

hook 内维护两个帧 ID：

```ts
let baseFrameId: number | null = null
let overlayFrameId: number | null = null
```

### 底层调度

```ts
function invalidateBase(): void {
  if (baseFrameId !== null) return

  baseFrameId = requestAnimationFrame(() => {
    baseFrameId = null
    frameModelRef.current = createChartFrameModel(latest inputs)
    drawBaseFrame(...)
    invalidateOverlay()
  })
}
```

底层失效来源：

- `candles` ref 更新。
- `visibleCount` ref 更新。
- ResizeObserver 观察到 CSS 尺寸变化。
- 检测到 `devicePixelRatio` 变化。
- hook 首次挂载。

React effect 只更新输入 ref 并调用 `invalidateBaseRef.current()`，不因每个 tick 重建 ResizeObserver 或 pointer 监听器。

### 顶层调度

```ts
function invalidateOverlay(): void {
  if (overlayFrameId !== null) return

  overlayFrameId = requestAnimationFrame(() => {
    overlayFrameId = null
    drawOverlayFrame(...)
  })
}
```

顶层失效来源：

- `pointermove`。
- `pointerleave`。
- 底层帧完成，因为 scales 可能已变化。
- ResizeObserver 或 DPR 变化。
- hook 首次挂载。

同一浏览器帧中的多个 pointermove 只会产生一次顶层绘制。

## Resize 与 DPR

ResizeObserver 观察共享容器，不分别观察两个 Canvas。

每次 resize：

1. ResizeObserver 观察容器，但尺寸读取底层 Canvas 自身的 `getBoundingClientRect()` CSS width/height，避免容器边框混入 backing size。
2. 为两个 Canvas 设置相同的 `width = round(cssWidth * dpr)` 和 `height = round(cssHeight * dpr)`。
3. 为两个 context 设置 `setTransform(dpr, 0, 0, dpr, 0, 0)`。
4. 使底层失效；底层完成后会继使顶层失效。

没有永久 rAF 后，DPR 改变不能依赖每帧轮询。本阶段在以下时机重新读取 DPR：

- ResizeObserver 回调。
- 底层失效帧执行前。
- pointer 事件使顶层失效前。

如果发现 DPR 与保存值不同，先执行统一 resize，再绘制。

## Cleanup

hook 卸载时必须：

```text
disposed = true
→ baseFrameId 非 null 则 cancelAnimationFrame
→ overlayFrameId 非 null 则 cancelAnimationFrame
→ ResizeObserver.disconnect()
→ overlayCanvas.removeEventListener(pointermove)
→ overlayCanvas.removeEventListener(pointerleave)
→ invalidateBaseRef.current = no-op
→ invalidateOverlayRef.current = no-op
```

已调度回调在进入绘制前仍需检查 `disposed`。

## 文件边界

### 新增

```text
src/features/custom-canvas/engine/createChartFrameModel.ts
src/features/custom-canvas/engine/drawBaseFrame.ts
src/features/custom-canvas/engine/drawOverlayFrame.ts
src/features/custom-canvas/hooks/useDualCanvasRenderer.ts
```

### 修改

```text
src/features/custom-canvas/CustomCanvasChart.tsx
src/features/custom-canvas/customCanvas.css
src/features/custom-canvas/engine/types.ts
src/features/custom-canvas/engine/drawGrid.ts
```

### 删除

```text
src/features/custom-canvas/engine/drawFrame.ts
src/features/custom-canvas/hooks/useCanvasRenderer.ts
```

删除只发生在新链路接入、搜索无引用、全量验证通过之后。

## 测试策略

### 单元与静态验证

- 现有 visible range、price range 和 scales 测试保持通过。
- `createChartFrameModel` 测试空数据返回 `null`。
- 帧模型只保留最近 `visibleCount` 根 Candle。
- 帧模型产生有效 plotRect、priceRange 和 scales。
- TypeScript build 保证底层和顶层绘制只使用帧模型的公开边界。

### 浏览器验证

- DOM 中恰好存在两个 Canvas。
- 两层 CSS 尺寸和 DPR backing size 相同。
- 初始绘制完成后，行情暂停且鼠标不动时，两层 `clearRect` 计数在观测窗口内不增加。
- pointermove 只增加顶层 `clearRect` 计数，底层不变。
- pointerleave 会让顶层再绘一次并清除 hover。
- tick 到达时底层重绘，并在共享模型更新后让顶层重绘。
- resize 后两层同步调整，内容与十字线仍正确对齐。
- 浏览器控制台无错误。

## 验收标准

- 页面视觉和当前单 Canvas 版本保持一致。
- 不再存在永久自调度的 rAF render loop。
- 空闲时底层和顶层都不持续清空或绘制。
- 鼠标移动只刷新顶层。
- 数据或尺寸变化会刷新底层并同步顶层。
- DPR、ResizeObserver、pointer 监听器和所有未执行 rAF 都正确清理。
- 全部单元测试、lint、build 和浏览器端 invalidation 验证通过。
