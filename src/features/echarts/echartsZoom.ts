export interface EChartsZoomRange {
  startValue: number
  endValue: number
}

export function getEChartsZoomRange(
  dataLength: number,
  visibleCount: number,
): EChartsZoomRange {
  const safeDataLength = Math.max(0, Math.floor(dataLength))
  const safeVisibleCount = Math.max(1, Math.floor(visibleCount))

  if (safeDataLength === 0) {
    return {
      startValue: 0,
      endValue: 0,
    }
  }

  return {
    startValue: Math.max(0, safeDataLength - safeVisibleCount),
    endValue: safeDataLength - 1,
  }
}
