/** Native horizontal scrolling starts at 0 in both directions. RTL offsets
 * become negative in modern browsers; return distance from inline-start.
 */
export function inlineScrollOffset(scrollLeft: number, direction: "ltr" | "rtl"): number {
  return Math.max(0, direction === "rtl" ? -scrollLeft : scrollLeft);
}

/** Convert physical viewport geometry to the scroll offset that aligns a card.
 * Geometry stays physical, so variable widths and RTL need no offsetLeft math.
 */
export function scrollOffsetForItem(
  track: { left: number; right: number; width: number },
  item: { left: number; right: number; width: number },
  scrollLeft: number,
  direction: "ltr" | "rtl",
  align: "start" | "center" = "start",
): number {
  if (align === "center") return scrollLeft + (item.left + item.right - track.left - track.right) / 2;
  return scrollLeft + (direction === "rtl" ? item.right - track.right : item.left - track.left);
}
