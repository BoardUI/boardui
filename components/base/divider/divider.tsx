import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cx, sortCx } from "@/utils/cx";

export type DividerVariant = "single" | "double" | "fill";
export type DividerAlign = "start" | "center" | "end";

export interface DividerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Single hairline, two framing hairlines, or a soft filled strip. */
  variant?: DividerVariant;
  /** Positions the divider content while keeping the remaining line flexible. */
  align?: DividerAlign;
  /** Text, a button, or any compact control placed in the divider. */
  children?: ReactNode;
  /** Extra classes for the content wrapper. */
  contentClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

const styles = sortCx({
  root: "w-full",
  line: "h-px min-w-0 flex-1 bg-separator-border",
  content: "shrink-0 text-body-medium text-text-secondary",
  align: {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  },
  withContent: {
    single: "flex items-center gap-3",
    double: "flex items-center border-y border-separator-border py-2.5",
    fill: "flex items-center rounded-2lg bg-background-secondary-default px-4 py-2.5",
  },
  empty: {
    single: "h-px bg-separator-border",
    double: "h-2 border-y border-separator-border",
    fill: "h-2 rounded-full bg-background-secondary-default",
  },
});

/**
 * Horizontal content divider with three BoardUI surface treatments.
 *
 * `single` places content within one continuous hairline, `double` frames it
 * with a line above and below, and `fill` uses the secondary surface color.
 * Children stay completely composable, so labels, buttons, and small controls
 * can share the same primitive.
 */
export function Divider({
  variant = "single",
  align = "center",
  children,
  contentClassName,
  className,
  ref,
  ...props
}: DividerProps) {
  const hasContent = children !== undefined && children !== null;

  if (!hasContent) {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        data-variant={variant}
        className={cx(styles.root, styles.empty[variant], className)}
        {...props}
      />
    );
  }

  const showLeadingLine = variant === "single" && align !== "start";
  const showTrailingLine = variant === "single" && align !== "end";

  return (
    <div
      ref={ref}
      data-variant={variant}
      data-align={align}
      className={cx(
        styles.root,
        styles.withContent[variant],
        styles.align[align],
        className,
      )}
      {...props}
    >
      {showLeadingLine ? <span aria-hidden className={styles.line} /> : null}
      <div className={cx(styles.content, contentClassName)}>{children}</div>
      {showTrailingLine ? <span aria-hidden className={styles.line} /> : null}
    </div>
  );
}
