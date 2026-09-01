"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  OverlayArrow as AriaOverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
} from "react-aria-components";
import type { TooltipProps as AriaTooltipProps } from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";

/**
 * Light-surface tooltip, styled to match the card / dropdown family:
 *   surface  bg background/primary/default (white), 1px border/button/default,
 *            radius/lg (8px), shadow/dropdown, text/primary.
 *   sizes    sm → px 10 py 6, Caption 1/Medium (12px)
 *            md → px 12 py 8, Body 1/Medium   (14px)
 *   arrow    filled caret (background/primary/default); a distinct path per
 *            side (not one path rotated with CSS) faces the trigger via
 *            OverlayArrow's `placement` render prop — see `TOOLTIP_CARETS` below.
 *
 * Behaviour comes from react-aria's TooltipTrigger / Tooltip — hover + focus
 * open, Escape closes, positioning + collision flipping, and the
 * `aria-describedby` wiring onto the trigger. We only dress the surface.
 *
 *   <TooltipTrigger delay={0}>
 *     <Button>Hover me</Button>
 *     <Tooltip size="md">Helpful copy</Tooltip>
 *   </TooltipTrigger>
 *
 * The trigger's single child must be focusable (react-aria `Button`, or any
 * component built on `useFocusable`).
 * BoardUI opens and begins closing immediately. The tooltip surface itself is
 * non-interactive, so moving off the trigger never keeps it open and tooltip
 * copy cannot be selected accidentally.
 */

export type TooltipSize = "sm" | "md";

const sizes = sortCx({
  sm: "px-2.5 py-1.5 text-caption-1-medium",
  md: "px-3 py-2 text-body-medium rounded-2lg",
});

/**
 * One hand-drawn caret per placement instead of a single path rotated with
 * CSS `transform`. Rotating a non-square (12×7) SVG changes its *visual*
 * footprint (7×12 at 90°) but not its *layout* box — `transform` never
 * affects layout — so `OverlayArrow` (which sizes/positions the arrow using
 * its unrotated 12×7 box) leaves a real ~2.5px gap between the rotated
 * triangle and the tooltip body for `left`/`right`. Each entry below instead
 * has `width`/`height` matching its own true rendered footprint, so the
 * layout box is always exactly right — no transform, no gap.
 *
 * Each path is left open on the edge touching the tooltip body (no "Z", so
 * only the two other edges get a stroke), and `shadow` points further along
 * the direction the tip already points — past the tip, never back toward the
 * body — matching the one spot that already looked right by default.
 */
export const TOOLTIP_CARETS = sortCx({
  top: { width: 12, height: 7, path: "M0 0 L6 6 L12 0", shadow: "0 1.5px 1px" },
  bottom: { width: 12, height: 7, path: "M0 7 L6 1 L12 7", shadow: "0 -1.5px 1px" },
  // left/right carets stick out sideways from the body; their shadow should
  // still fall *downward* (light-from-top, matching the body's shadow-dropdown)
  // rather than horizontally, which read as floating.
  left: { width: 7, height: 12, path: "M0 0 L6 6 L0 12", shadow: "0 1.5px 1px" },
  right: { width: 7, height: 12, path: "M7 0 L1 6 L7 12", shadow: "0 1.5px 1px" },
});

export interface TooltipProps extends Omit<AriaTooltipProps, "children"> {
  children?: ReactNode;
  /** Surface size. `sm` → 12px Caption 1, `md` → 14px Body 1. Default `sm`. */
  size?: TooltipSize;
  /** Show the little caret pointing at the trigger. Default `true`. */
  showArrow?: boolean;
}

export function Tooltip({ children, className, size = "sm", showArrow = true, offset = 10, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={offset}
      {...props}
      className={(state) =>
        cx(
          "pointer-events-none z-50 max-w-[240px] select-none rounded-lg border border-border-button-default bg-background-primary-default text-text-primary shadow-dropdown",
          sizes[size],
          // Blur + scale in/out. react-aria stamps `data-entering` on mount then
          // removes it (transition to base), and holds the element mounted while
          // `data-exiting` is set so the same transition plays in reverse. The
          // `transition` utility covers scale, filter (blur) and opacity.
          "transition duration-200 ease-out",
          "data-[entering]:scale-90 data-[entering]:opacity-0 data-[entering]:blur-[4px]",
          "data-[exiting]:scale-90 data-[exiting]:opacity-0 data-[exiting]:blur-[4px]",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {showArrow && (
        <AriaOverlayArrow>
          {({ placement }) => {
            // `placement` includes react-aria's `"center"` (for other overlay
            // types); this tooltip only ever resolves to one of our 4 sides.
            const caret = TOOLTIP_CARETS[placement as keyof typeof TOOLTIP_CARETS] ?? TOOLTIP_CARETS.top;
            return (
              <svg
                width={caret.width}
                height={caret.height}
                viewBox={`0 0 ${caret.width} ${caret.height}`}
                className="block overflow-visible fill-background-primary-default stroke-border-button-default"
                style={{ filter: `drop-shadow(${caret.shadow} rgb(0 0 0 / 0.05))` }}
              >
                <path d={caret.path} />
              </svg>
            );
          }}
        </AriaOverlayArrow>
      )}
      {children}
    </AriaTooltip>
  );
}

export type TooltipTriggerProps = ComponentProps<typeof AriaTooltipTrigger>;

export function TooltipTrigger({ delay = 0, closeDelay = 0, ...props }: TooltipTriggerProps) {
  return <AriaTooltipTrigger delay={delay} closeDelay={closeDelay} {...props} />;
}
