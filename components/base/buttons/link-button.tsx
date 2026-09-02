import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { cx, sortCx } from "@/utils/cx";

/**
 * Link button — an inline text action styled like a link, sized on the same
 * scale as `Button` but without the container: no fill, no border, just the
 * label (plus optional icons) with an underline on hover.
 *
 * Variant / size matrix (mirrors Button's structure):
 *   Variant = primary (blue/600 text) | secondary (text/secondary)
 *   Size    = medium (Body 1/Medium, 20px icons)
 *           | small  (Body 1/Medium, 18px icons)
 *           | xs     (Caption 1/Semibold, 14px icons)
 *
 * Renders an `<a>` when `href` is passed, otherwise a `<button>` — the same
 * action can live in copy ("Learn more →") or trigger a handler. Icons are
 * rendered by the component itself via `leadingIcon` / `trailingIcon` (pass
 * the Remix Icon reference, e.g. `RiArrowRightLine`, not an element).
 */

type LinkButtonVariant = "primary" | "secondary";
type LinkButtonSize = "medium" | "small" | "xs";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface LinkButtonBaseProps {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface LinkButtonAnchorProps
  extends LinkButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

export interface LinkButtonButtonProps
  extends LinkButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
}

export type LinkButtonProps = LinkButtonAnchorProps | LinkButtonButtonProps;

const styles = sortCx({
  base: [
    "inline-flex items-center justify-center gap-1 whitespace-nowrap",
    "font-sans select-none cursor-pointer rounded-sm",
    "underline-offset-3 hover:underline",
    "transition-colors duration-150 ease",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed disabled:no-underline aria-disabled:cursor-not-allowed aria-disabled:no-underline",
  ].join(" "),

  size: {
    medium: "text-body-medium",
    small: "text-body-medium",
    xs: "text-caption-1-semibold",
  },

  icon: {
    medium: "size-5 shrink-0",
    small: "size-[18px] shrink-0",
    xs: "size-3.5 shrink-0",
  },

  variant: {
    // Hover keeps the resting color — the underline is the hover cue; only
    // the press darkens.
    primary: [
      "text-accent-600 active:text-accent-800",
      "disabled:text-text-tertiary aria-disabled:text-text-tertiary",
    ].join(" "),
    secondary: [
      "text-text-secondary active:text-text-primary",
      "disabled:text-text-tertiary aria-disabled:text-text-tertiary",
    ].join(" "),
  },
});

export function LinkButton({
  variant = "primary",
  size = "medium",
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  disabled = false,
  ...props
}: LinkButtonProps) {
  const classes = cx(styles.base, styles.size[size], styles.variant[variant], className);
  const content = (
    <>
      {Leading ? <Leading className={styles.icon[size]} aria-hidden /> : null}
      {children !== undefined && children !== null && <span>{children}</span>}
      {Trailing ? <Trailing className={styles.icon[size]} aria-hidden /> : null}
    </>
  );

  if (props.href !== undefined) {
    const { ref, href, ...anchorProps } = props as LinkButtonAnchorProps;
    return (
      <a
        ref={ref}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={classes}
        {...anchorProps}
      >
        {content}
      </a>
    );
  }

  const { ref, type = "button", ...buttonProps } = props as LinkButtonButtonProps;
  return (
    <button ref={ref} type={type} disabled={disabled} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}

/** Style maps, exported for advanced composition and the dev Design Tuner. */
export const linkButtonStyles = styles;
