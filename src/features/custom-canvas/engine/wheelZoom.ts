export function getWheelZoomFactor(
  deltaY: number,
  deltaMode: number,
  plotHeight: number,
): number {
  const deltaUnit =
    deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, plotHeight) : 1
  const normalizedDelta = deltaY * deltaUnit
  const exponent = Math.max(-1, Math.min(1, -normalizedDelta * 0.002))

  return Math.exp(exponent)
}
