"use client";

import { useEffect, useState, useContext } from "react";
import {
  Button as RACButton,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarStateContext,
  RangeCalendarStateContext,
} from "react-aria-components";
import type { CalendarCellRenderProps } from "react-aria-components";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { cx } from "@/utils/cx";

/**
 * Shared building blocks for the base/date-picker family — `DateRangePicker`
 * (dual-month, node 3871:5738) and `DatePicker` (single-month, node
 * 3879:6708) are the same visual system (month panel, day cell, editable
 * date chip) around two different react-aria-components roots
 * (`RangeCalendar` vs `Calendar`). Keeping the pieces here means a Figma
 * fidelity fix only has to happen once.
 */

/** Exact paths from Figma's month-nav chevrons (node 3869:5461 / 3869:5528) — a
 *  16×16 glyph, 2px round-capped stroke, mirrored around x=8. */
export function ChevronLeft16({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M9 4L5.70711 7.29289C5.31658 7.68342 5.31658 8.31658 5.70711 8.70711L9 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronRight16({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M7 4L10.2929 7.29289C10.6834 7.68342 10.6834 8.31658 10.2929 8.70711L7 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function formatTriggerDate(date: CalendarDate) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    date.toDate(getLocalTimeZone()),
  );
}

export function formatChipDate(date: CalendarDate) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`;
}

/** Parses the chip's own "DD/MM/YYYY" format back into a CalendarDate, or
 *  null if the text isn't a valid date (out-of-range day/month is rejected
 *  up front; CalendarDate itself constrains impossible day-in-month combos
 *  like Feb 30). */
export function parseChipDate(text: string): CalendarDate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new CalendarDate(year, month, day);
}

export function DayCell(props: CalendarCellRenderProps & { isRange: boolean }) {
  const { date, formattedDate, isSelected, isSelectionStart, isSelectionEnd, isHovered, isFocusVisible, isDisabled, isOutsideMonth, isRange } = props;

  if (isOutsideMonth) {
    return <div className="size-8" />;
  }

  const dayOfWeek = date.toDate(getLocalTimeZone()).getDay(); // 0 = Sun ... 6 = Sat

  // A plain (non-range) Calendar never sets isSelectionStart/isSelectionEnd —
  // those are range-only concepts, so they stay false even for the one
  // selected day. Without isRange, that day would fall through to the
  // "middle of a range" backdrop path instead of rendering as its own pill.
  const isSingleDay = isRange ? isSelectionStart && isSelectionEnd : isSelected;
  const isEdge = isRange ? isSelectionStart || isSelectionEnd : isSelected;

  // Cells sit 12px apart (Figma's row/column gap). A selected range should
  // still read as one continuous band, so the background bridges that gap by
  // extending half of it (6px) toward each selected neighbor — never past
  // the first/last column of a row, where there's no neighbor to bridge to.
  // Only meaningful for a RangeCalendar; a plain Calendar never bridges.
  const extendLeft = isRange && isSelected && !isSelectionStart && dayOfWeek !== 0;
  const extendRight = isRange && isSelected && !isSelectionEnd && dayOfWeek !== 6;

  // The blue backgrounds fade in/out on opacity instead of popping instantly.
  // Both layers always render (geometry computed regardless of selection) so
  // toggling opacity is a plain CSS transition, not a mount/unmount — that
  // keeps ~70 cells worth of range changes cheap and reliably animated.
  // border-radius rides the same transition as opacity: the rounding classes
  // still flip instantly on deselect (the shape a cell "should" have has no
  // in-between state), but transitioning the property means it eases toward
  // square in sync with the fade instead of snapping to square immediately
  // while the color is still visible.
  return (
    <div className="relative size-8">
      <span
        aria-hidden
        className={cx(
          "absolute inset-y-0 bg-date-range-background transition-[opacity,border-radius] duration-100 ease-out",
          isSelectionStart ? "left-1/2" : extendLeft ? "-left-1.5" : "left-0",
          isSelectionEnd ? "right-1/2" : extendRight ? "-right-1.5" : "right-0",
          !isSelectionStart && dayOfWeek === 0 && "rounded-l-lg",
          !isSelectionEnd && dayOfWeek === 6 && "rounded-r-lg",
          isSelected && !isSingleDay ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cx(
          "relative flex size-8 items-center justify-center rounded-lg outline-none",
          !isSelected && isHovered && "bg-background-secondary-hover",
          "transition-colors duration-100 ease-out",
          isFocusVisible && "ring-2 ring-inset ring-border-focus-ring",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "absolute inset-0 bg-date-range-edge-background transition-[opacity,border-radius] duration-100 ease-out",
            isSingleDay && "rounded-lg",
            isSelectionStart && !isSingleDay && "rounded-l-lg",
            isSelectionEnd && !isSingleDay && "rounded-r-lg",
            isEdge ? "opacity-100" : "opacity-0",
          )}
        />
        <span className={cx("relative text-body-medium text-text-primary", isDisabled && "text-text-tertiary")}>
          {formattedDate}
        </span>
      </div>
    </div>
  );
}

export function MonthPanel({
  offset,
  showPrev,
  showNext,
  bare = false,
  hideHeader = false,
}: {
  offset: number;
  showPrev?: boolean;
  showNext?: boolean;
  /** Skip the panel's own card chrome (width, bg, padding, shadow) so it can
   *  be embedded directly inside a caller-styled container instead — used by
   *  the calendar template's inline month switcher, which supplies its own
   *  card (matching a different surface's border/shadow). */
  bare?: boolean;
  /** Skip the title + prev/next row entirely — used when a caller already
   *  renders its own single month title/nav (the calendar template's month
   *  switcher pill) and only needs the day grid underneath it. */
  hideHeader?: boolean;
}) {
  // Works inside either a RangeCalendar (DateRangePicker) or a plain Calendar
  // (DatePicker) — exactly one of these contexts is non-null depending on
  // which root rendered it, and both expose the same `visibleRange` shape.
  const rangeState = useContext(RangeCalendarStateContext);
  const singleState = useContext(CalendarStateContext);
  const state = rangeState ?? singleState;
  const isRange = rangeState != null;
  const panelDate = state ? state.visibleRange.start.add({ months: offset }) : null;
  const title = panelDate
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(panelDate.toDate(getLocalTimeZone()))
    : "";

  return (
    <div className={bare ? "w-[296px] shrink-0" : "w-[326px] shrink-0 rounded-2xl bg-background-primary-default p-[15px] shadow-xs"}>
      <div className="flex flex-col gap-5">
        {!hideHeader && (
          <div className="flex items-center justify-between">
            {showPrev ? (
              <RACButton
                slot="previous"
                className="flex size-4 cursor-pointer items-center justify-center rounded-[3px] text-text-secondary outline-none transition-colors duration-150 ease hover:bg-background-secondary-hover"
              >
                <ChevronLeft16 />
              </RACButton>
            ) : (
              <span className="size-4" aria-hidden />
            )}
            <span className="flex-1 text-center text-body-medium text-text-primary">{title}</span>
            {showNext ? (
              <RACButton
                slot="next"
                className="flex size-4 cursor-pointer items-center justify-center rounded-[3px] text-text-secondary outline-none transition-colors duration-150 ease hover:bg-background-secondary-hover"
              >
                <ChevronRight16 />
              </RACButton>
            ) : (
              <span className="size-4" aria-hidden />
            )}
          </div>
        )}
        <CalendarGrid
          offset={{ months: offset }}
          weekdayStyle="short"
          className="-m-3 self-start border-separate outline-none"
          style={{ borderSpacing: "12px 12px" }}
        >
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="size-6 pb-0 text-center text-body-medium text-text-secondary">
                {day.slice(0, 2)}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell date={date} className="p-0 outline-none">
                {(cellProps) => <DayCell {...cellProps} isRange={isRange} />}
              </CalendarCell>
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </div>
    </div>
  );
}

/** One editable "DD/MM/YYYY" chip. Keeps its own draft text while typing so
 *  the field doesn't reformat on every keystroke; commits on blur/Enter,
 *  reverting to the last valid value if the text doesn't parse. */
export function DateChipInput({
  date,
  label,
  onCommit,
}: {
  date: CalendarDate;
  label: string;
  onCommit: (date: CalendarDate) => void;
}) {
  const formatted = formatChipDate(date);
  const [text, setText] = useState(formatted);

  useEffect(() => {
    setText(formatted);
  }, [formatted]);

  const commit = () => {
    const parsed = parseChipDate(text);
    if (parsed) {
      onCommit(parsed);
    } else {
      setText(formatted);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setText(formatted);
      }}
      aria-label={label}
      className="w-[104px] rounded-2lg border border-border-button-default bg-background-primary-default px-2 py-2 text-body-medium text-text-primary shadow-xs outline-none transition-colors duration-100 ease-out focus-visible:border-border-button-active"
    />
  );
}

/** Shared trigger-button chrome for both pickers (Figma's "Primary" button —
 *  calendar icon + formatted-value text, white surface, radius/2lg). */
export const triggerButtonClassName = cx(
  "inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-2lg border border-border-button-default bg-background-primary-default p-2 shadow-xs outline-none",
  "transition-[background-color,border-color,box-shadow] duration-150 ease",
  "hover:bg-background-primary-hover hover:border-border-button-hover",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
  "disabled:cursor-not-allowed disabled:bg-background-primary-disabled disabled:text-text-tertiary disabled:shadow-none",
);

/** Shared popover chrome (Figma's rounded/3xl, background/secondary/default
 *  "Calendar component" surface) for both pickers. */
export const popoverClassName = cx(
  "origin-top rounded-3xl bg-background-secondary-default shadow-dropdown",
  "transition duration-150 ease-out",
  "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
  "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
);
