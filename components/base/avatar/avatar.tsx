/* eslint-disable @next/next/no-img-element */
import type { HTMLAttributes, Ref } from "react";
import { cx, sortCx } from "@/utils/cx";

/**
 * Figma source: Board UI → Avatar (styles Avatar/1…Avatar/26; used throughout
 * dashboard 1, node 3731:2932).
 *
 * Sizes used in the designs (px):
 *   xs = 20   breadcrumb workspace marks     (initials 10/15 semibold)
 *   sm = 24   table rows                     (initials 12/16 semibold)
 *   md = 32   sidebar workspace / team card  (initials 16/22 semibold)
 *   lg = 36   people cards                   (initials 18/24 semibold)
 *
 * Renders a photo when `src` is given, otherwise centered initials on a
 * tinted disc. Initial tints from Figma:
 *   neutral → bg avatar/neutral/background, text text/secondary
 *   blue    → bg color/blue/300,    text color/blue/900
 *   lime    → bg color/lime/200,    text color/lime/700
 *   pink    → bg color/pink/200,    text color/pink/500
 */

type AvatarSize = "xs" | "sm" | "md" | "lg";
type AvatarColor = "neutral" | "blue" | "lime" | "pink";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  size?: AvatarSize;
  color?: AvatarColor;
  /** Photo URL. Wins over `initials`. */
  src?: string;
  alt?: string;
  /** Fallback initials, e.g. "M". */
  initials?: string;
  ref?: Ref<HTMLSpanElement>;
}

const styles = sortCx({
  base: "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-center align-middle transition-[width,height,font-size] duration-200 ease",
  size: {
    xs: "size-5 text-[10px] leading-[15px] font-semibold",
    sm: "size-6 text-caption-1-semibold tracking-normal",
    md: "size-8 text-headline-semibold",
    lg: "size-9 text-[18px] leading-6 font-semibold",
  },
  color: {
    neutral: "bg-avatar-neutral-background text-text-secondary",
    blue: "bg-blue-300 text-blue-900",
    lime: "bg-lime-200 text-lime-700",
    pink: "bg-pink-200 text-pink-500",
  },
});

export function Avatar({
  size = "md",
  color = "neutral",
  src,
  alt,
  initials,
  className,
  ref,
  ...props
}: AvatarProps) {
  return (
    <span
      ref={ref}
      className={cx(styles.base, styles.size[size], styles.color[color], className)}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
