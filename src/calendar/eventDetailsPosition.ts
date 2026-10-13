export function getEventDetailsPosition(
  weekday: number,
  anchor: { left: number; right: number; top: number },
  viewport: { width: number; height: number },
  cardHeight: number,
) {
  const side = weekday >= 1 && weekday <= 3 ? 'right' : 'left'
  const width = Math.min(380, viewport.width - 24)
  const preferredLeft = side === 'right' ? anchor.right + 12 : anchor.left - width - 12
  return {
    side,
    width,
    left: Math.max(12, Math.min(preferredLeft, viewport.width - width - 12)),
    top: Math.max(12, Math.min(anchor.top, viewport.height - cardHeight - 12)),
  }
}
