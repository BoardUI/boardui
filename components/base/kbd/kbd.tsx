import type { HTMLAttributes, Ref } from "react";
import { cx } from "@/utils/cx";

/**
 * Figma source: Board UI → dashboard 1 quick-search shortcut (node 3731:2955).
 *
 * Keyboard shortcut hint: 12/16 semibold on a fully-rounded neutral pill.
 *   - semantic neutral background and foreground for theme-safe contrast
 *   - px 4, py 2, radius full
 */

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

export function Kbd({ className, ref, ...props }: KbdProps) {
  return (
    <kbd
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center rounded-full bg-kbd-background px-1 py-0.5 font-sans text-caption-1-semibold tracking-normal whitespace-nowrap text-kbd-foreground",
        className,
      )}
      {...props}
    />
  );
}
