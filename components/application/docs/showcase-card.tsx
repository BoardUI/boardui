"use client";

/**
 * The index and landing showcase card: preview on top, caption below, the
 * whole card a link. On its own so the starter can use it too.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

export type ShowcaseCardProps = {
  title: string;
  description: string;
  href: string;
  children: ReactNode;
  fade?: boolean;
  fadeClassName?: string;
  fadeOnHover?: "sidebar" | "dropdown";
  releaseOverflowAfter?: number;
  previewClassName?: string;
  /** Extra classes on the description, e.g. `line-clamp-none` to lift the 2-line clamp. */
  descriptionClassName?: string;
  /** Let the preview receive the pointer (hover states, dropdowns): the card
   *  link then covers only the caption block instead of the whole card. */
  interactive?: boolean;
  /** Class for the card itself — the docs index uses it to grow template cards. */
  className?: string;
  /** Open the link in a new tab (the starter links out to boardui.com). */
  external?: boolean;
};

export function ShowcaseCard({
  title,
  description,
  href,
  children,
  fade = false,
  fadeClassName,
  fadeOnHover,
  releaseOverflowAfter,
  previewClassName,
  descriptionClassName,
  interactive = false,
  className,
  external = false,
}: ShowcaseCardProps) {
  const overflowTimerRef = useRef<number | null>(null);
  const [overflowReleased, setOverflowReleased] = useState(false);

  useEffect(() => () => {
    if (overflowTimerRef.current !== null) window.clearTimeout(overflowTimerRef.current);
  }, []);

  const scheduleOverflowRelease = () => {
    if (releaseOverflowAfter === undefined) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;
    overflowTimerRef.current = window.setTimeout(() => {
      overflowTimerRef.current = null;
      setOverflowReleased(true);
    }, releaseOverflowAfter);
  };

  const restoreOverflowClip = () => {
    if (overflowTimerRef.current !== null) {
      window.clearTimeout(overflowTimerRef.current);
      overflowTimerRef.current = null;
    }
    setOverflowReleased(false);
  };

  return (
    <article
      className={cx(
        "landing-showcase-card group/card relative h-[332px] cursor-pointer overflow-hidden rounded-[28px] border border-transparent bg-background-primary-default [container-type:inline-size] dark:bg-transparent xl:h-[299px]",
        className,
      )}
      onMouseEnter={scheduleOverflowRelease}
      onMouseLeave={restoreOverflowClip}
    >
      <div
        className={cx(
          "group/preview relative h-[230px] w-full xl:h-[197px]",
          overflowReleased ? "overflow-visible" : "overflow-hidden",
          previewClassName,
        )}
      >
        {children}
        {fade ? (
          <div
            aria-hidden
            className={cx(
              "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-11 bg-linear-to-b from-transparent to-background-primary-default transition-opacity ease-out dark:to-background-full",
              fadeOnHover
                ? "[transition-delay:0ms] [transition-duration:120ms] sm:group-hover/card:opacity-0 sm:group-hover/card:[transition-duration:400ms]"
                : "duration-500",
              fadeOnHover === "sidebar" && "sm:group-hover/card:[transition-delay:1400ms]",
              fadeOnHover === "dropdown" && "sm:group-hover/card:[transition-delay:700ms]",
              fadeClassName,
            )}
          />
        ) : null}
      </div>
      <div className={cx("flex flex-col gap-1 px-5 pt-3 pb-5", interactive && "relative")}>
        <h3 className="text-headline-medium text-text-primary">{title}</h3>
        <p className={cx("line-clamp-2 text-headline-regular text-pretty text-text-secondary", descriptionClassName)}>
          {description}
        </p>
        {interactive && (
          <CardLink
            href={href}
            external={external}
            aria-label={`View ${title}`}
            className="absolute inset-0 z-50 rounded-b-[25px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring"
          >
            <span className="sr-only">View {title}</span>
          </CardLink>
        )}
      </div>
      {!interactive && (
        <CardLink
          href={href}
          external={external}
          aria-label={`View ${title}`}
          className="absolute inset-0 z-50 rounded-[25px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring"
        >
          <span className="sr-only">View {title}</span>
        </CardLink>
      )}
    </article>
  );
}

/** Next's Link for the site, a plain anchor in a new tab when linking out. */
function CardLink({
  href,
  external,
  className,
  children,
  ...props
}: {
  href: string;
  external: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}
