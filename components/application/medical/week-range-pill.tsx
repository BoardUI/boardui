"use client";

import { useEffect, useState } from "react";
import { ChevronLeft16, ChevronRight16 } from "@/components/base/date-picker/shared";
import { cx } from "@/utils/cx";

/** Rectangular chevron hover, matched 1:1 to the date picker's month-nav
 *  buttons (see `MonthPanel` in date-picker/shared). */
const NAV_BUTTON = cx(
  "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-text-secondary outline-none",
  "transition-colors duration-150 ease hover:bg-background-secondary-hover",
  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
);

/**
 * Rolling-counter label: on change the outgoing value lifts 5px + fades out
 * while the incoming value rises in from 5px below + fades in. Both labels
 * coexist for the ~220ms transition, clipped to the line box so the movement
 * reads like a counter tick rather than a crossfade.
 */
function AnimatedLabel({ label }: { label: string }) {
  const [current, setCurrent] = useState(label);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    if (label !== current) {
      setPrevious(current);
      setCurrent(label);
    }
  }, [label, current]);

  useEffect(() => {
    if (previous === null) return;
    const t = setTimeout(() => setPrevious(null), 240);
    return () => clearTimeout(t);
  }, [previous]);

  return (
    <span className="relative flex-1 overflow-hidden text-center text-body-medium whitespace-nowrap text-text-primary">
      {/* Invisible spacer keeps the line box height/width for the absolutes. */}
      <span className="invisible">{current}</span>
      {previous !== null && (
        <span
          key={`out-${previous}`}
          className="animate-label-out absolute inset-0 flex items-center justify-center"
        >
          {previous}
        </span>
      )}
      <span
        key={`in-${current}`}
        className={cx(
          "absolute inset-0 flex items-center justify-center",
          previous !== null && "animate-label-in",
        )}
      >
        {current}
      </span>
    </span>
  );
}

/**
 * Figma source: Board UI → medical profile dashboard → "Month 1" pill (e.g.
 * node 3950:5720 for the "29 Jun - 5 Jul" week variant, node 3950:5897 for
 * the "December" month variant on Most active days) — same 151×32 chrome
 * for both.
 *
 * Pass `onPrev`/`onNext` to make the chevrons real buttons (the Most active
 * days month switcher); omit them for the decorative static pill used by
 * the other cards, where Figma shows the same fixed range everywhere.
 */
export function WeekRangePill({
  label,
  onPrev,
  onNext,
  className,
}: {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  /** Override the default 151px width (e.g. the narrower month switcher). */
  className?: string;
}) {
  const interactive = !!(onPrev || onNext);
  return (
    <div
      className={cx(
        "flex h-8 w-[151px] shrink-0 items-center justify-between gap-1 rounded-2lg border border-border-button-default bg-background-primary-default px-1 py-1 shadow-xs",
        className,
      )}
    >
      {interactive ? (
        <button type="button" aria-label="Previous" onClick={onPrev} className={NAV_BUTTON}>
          <ChevronLeft16 />
        </button>
      ) : (
        <span className="flex size-4 shrink-0 items-center justify-center text-text-secondary" aria-hidden>
          <ChevronLeft16 />
        </span>
      )}
      {/* The interactive switcher rolls its label like a counter as the month
          changes; static pills just render plain text. */}
      {interactive ? (
        <AnimatedLabel label={label} />
      ) : (
        <span className="flex-1 text-center text-body-medium whitespace-nowrap text-text-primary">
          {label}
        </span>
      )}
      {interactive ? (
        <button type="button" aria-label="Next" onClick={onNext} className={NAV_BUTTON}>
          <ChevronRight16 />
        </button>
      ) : (
        <span className="flex size-4 shrink-0 items-center justify-center text-text-secondary" aria-hidden>
          <ChevronRight16 />
        </span>
      )}
    </div>
  );
}
