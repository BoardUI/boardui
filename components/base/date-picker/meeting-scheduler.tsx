"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { Calendar, Dialog, Popover } from "react-aria-components";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { RiCalendarLine, RiFlagLine, RiGlobalLine } from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { MonthPanel, popoverClassName, triggerButtonClassName } from "@/components/base/date-picker/shared";
import { cx } from "@/utils/cx";
import { useDismissOnOutsidePress } from "@/utils/use-dismiss-on-outside-press";

/**
 * Figma source: Board UI → "Meeting" (node 3881:7618).
 *
 * A Calendly/Cal.com-style booking panel: host card + meeting summary on the
 * left, a single-month calendar in the middle (reusing `MonthPanel` from
 * `./shared`), and a timezone / hour-format / time-slot sidebar on the
 * right. Like the other two pickers, the panel is a real react-aria
 * `Popover` — but since there's no `DialogTrigger` here (the trigger is a
 * plain button, not a `Dialog`), it's wired up via `triggerRef` + controlled
 * `isOpen` instead. That keeps the panel a portaled overlay that never
 * affects layout, so the trigger (Figma's own top-right chip, repurposed
 * from a static readout into the open/close control) can sit compactly
 * next to other trigger buttons instead of dragging a whole row wide.
 *
 * Two deliberate departures from the raw Figma frame:
 *  - The time-slot list (Figma: a static "14:00"..."18:30" mock that then
 *    repeats "14:00" a 14th time — clearly a copy/paste artifact, not real
 *    data) is generated as a real fixed 09:00–18:30 half-hour range instead.
 *  - The timezone row and the duration/language/conferencing rows are
 *    Figma "Dropdown" layers, but only the timezone row actually has a
 *    chevron — the other three are read-only summary rows here, matching
 *    what's visually present rather than the layer name.
 */

export interface MeetingSchedulerHost {
  name: string;
  email: string;
  avatarInitial: string;
}

export interface MeetingSchedulerDetails {
  title: string;
  description?: string;
  durationMinutes: number;
  language?: string;
  conferencing?: string;
}

export interface MeetingSchedulerValue {
  date: CalendarDate;
  /** 24h "HH:mm", or `null` when a date is picked but no time slot yet. */
  time: string | null;
}

export interface MeetingSchedulerProps {
  host?: MeetingSchedulerHost;
  meeting?: MeetingSchedulerDetails;
  timezone?: string;
  value?: MeetingSchedulerValue | null;
  defaultValue?: MeetingSchedulerValue | null;
  onChange?: (value: MeetingSchedulerValue | null) => void;
  /** Render the panel open on mount. Default `false`. */
  defaultOpen?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Trigger button text. Default "Schedule a meeting". */
  triggerLabel?: string;
}

const DEFAULT_HOST: MeetingSchedulerHost = {
  name: "Mertcan Esmergul",
  email: "hi@mertcan.works",
  avatarInitial: "M",
};

const DEFAULT_MEETING: MeetingSchedulerDetails = {
  title: "30 min intro meeting",
  description: "Let's discuss your design needs and how we can collaborate 🥳",
  durationMinutes: 30,
  language: "English",
  conferencing: "Google meet",
};

function useTimeSlots() {
  return useMemo(() => {
    const slots: string[] = [];
    for (let minutes = 9 * 60; minutes <= 18 * 60 + 30; minutes += 30) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return slots;
  }, []);
}

function formatTime(time: string, use24h: boolean) {
  const [h, m] = time.split(":").map(Number);
  if (use24h) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatChipDateTime(value: MeetingSchedulerValue) {
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    value.date.toDate(getLocalTimeZone()),
  );
  return { date, time: value.time ?? "Select a time" };
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-[5px] text-body-medium text-text-primary">
      {icon}
      {children}
    </div>
  );
}

function GlyphIcon({ icon: Icon }: { icon: typeof RiGlobalLine }) {
  return <Icon className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />;
}

/** Figma's exact Google Meet mark, 20×20 (`public/brand/google_meet.png`). */
function GoogleMeetIcon() {
  return <Image src="/brand/google_meet.png" alt="" width={20} height={20} className="size-5 shrink-0" />;
}

function HourFormatToggle({ use24h, onChange }: { use24h: boolean; onChange: (use24h: boolean) => void }) {
  return (
    <div className="flex shrink-0 items-start gap-0.5 rounded-2lg">
      {(["12h", "24h"] as const).map((label, i) => {
        const selected = i === 1 ? use24h : !use24h;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i === 1)}
            className={cx(
              "cursor-pointer rounded-md px-2.5 py-1 text-body-medium transition-colors duration-150 ease",
              selected ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function MeetingScheduler({
  host = DEFAULT_HOST,
  meeting = DEFAULT_MEETING,
  timezone = "Amsterdam",
  value,
  defaultValue = null,
  onChange,
  defaultOpen = false,
  className,
  "aria-label": ariaLabel = "Schedule meeting",
  triggerLabel = "Schedule a meeting",
}: MeetingSchedulerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const timeSlots = useTimeSlots();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<MeetingSchedulerValue | null>(
    defaultValue ?? { date: today(getLocalTimeZone()), time: null },
  );
  const committedValue = isControlled ? value : internalValue;

  const [pendingValue, setPendingValue] = useState<MeetingSchedulerValue | null>(committedValue);
  const [use24h, setUse24h] = useState(true);
  // Never honor `defaultOpen` on the initial render: the ~700px-wide panel
  // being in the very first paint makes mobile Safari compute its layout
  // viewport from that width, permanently zooming the whole page out even
  // after the panel closes. Open it post-mount instead, and only on
  // viewports wide enough to show the panel without overflowing.
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!defaultOpen) return;
    if (window.matchMedia("(min-width: 640px)").matches) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  const commit = (next: MeetingSchedulerValue | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setIsOpen(false);
  };

  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);

  const chip = pendingValue ? formatChipDateTime(pendingValue) : null;
  const dayChip = pendingValue
    ? {
        weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(pendingValue.date.toDate(getLocalTimeZone())).slice(0, 2),
        day: pendingValue.date.day,
      }
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) setPendingValue(committedValue);
          setIsOpen((open) => !open);
        }}
        className={cx(triggerButtonClassName, className)}
      >
        <RiCalendarLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
        <span className="flex items-center justify-center whitespace-nowrap px-1 text-body-medium text-text-primary">
          {triggerLabel}
        </span>
        <ChevronDownSmall
          className={cx("size-4 shrink-0 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
        />
      </button>
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom end"
        offset={8}
        isNonModal
        className={popoverClassName}
      >
        <Dialog aria-label={ariaLabel} className="outline-none">
          <Calendar
            aria-label={ariaLabel}
            value={pendingValue?.date ?? null}
            onChange={(date) => setPendingValue((prev) => ({ date, time: prev?.time ?? null }))}
          >
            <div className="flex h-[429px] gap-4">
              {/* Host + meeting summary */}
              <div className="flex w-[207px] shrink-0 flex-col gap-4 py-4 pl-4">
                <div className="flex flex-col items-start gap-2">
                  <Avatar size="md" color="blue" initials={host.avatarInitial} />
                  <div className="flex flex-col text-body-medium">
                    <span className="text-text-primary">{host.name}</span>
                    <span className="text-text-secondary">{host.email}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-title-3-medium text-text-primary">{meeting.title}</p>
                  {meeting.description && (
                    <p className="text-body-2-medium text-text-secondary">{meeting.description}</p>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <InfoRow icon={<GlyphIcon icon={RiGlobalLine} />}>{meeting.durationMinutes} minutes</InfoRow>
                  {meeting.language && <InfoRow icon={<GlyphIcon icon={RiFlagLine} />}>{meeting.language}</InfoRow>}
                  {meeting.conferencing && <InfoRow icon={<GoogleMeetIcon />}>{meeting.conferencing}</InfoRow>}
                </div>
              </div>

              {/* Calendar + footer */}
              <div className="flex flex-col gap-3 pt-2 pb-3">
                <MonthPanel offset={0} showPrev showNext />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-2lg border border-border-button-default bg-background-primary-default px-2 py-2 text-body-medium text-text-primary shadow-xs">
                    {chip && (
                      <>
                        <span>{chip.date}</span>
                        <span className="text-text-secondary">{chip.time}</span>
                      </>
                    )}
                  </span>
                  <Button onClick={() => commit(pendingValue)} disabled={!pendingValue?.time}>
                    Send meeting
                  </Button>
                </div>
              </div>

              {/* Timezone + hour format + time slots */}
              <div className="flex h-full w-[170px] shrink-0 flex-col gap-3 overflow-hidden pt-4 pr-4">
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-between rounded-2lg outline-none"
                >
                  <span className="flex items-center gap-[5px] text-body-medium text-text-primary">
                    <RiGlobalLine className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
                    {timezone}
                  </span>
                  <ChevronDownSmall className="size-4 shrink-0 text-text-secondary" />
                </button>

                <div className="flex items-center justify-between">
                  {dayChip && (
                    <span className="inline-flex items-center gap-[3px] rounded-2lg bg-background-tertiary-default px-2 py-1 text-body-medium">
                      <span className="text-text-primary">{dayChip.weekday}</span>
                      <span className="text-text-secondary">{dayChip.day}</span>
                    </span>
                  )}
                  <HourFormatToggle use24h={use24h} onChange={setUse24h} />
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3"
                  style={{
                    maskImage: "linear-gradient(to bottom, transparent, black 16px, black 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, transparent, black 16px, black 100%)",
                  }}
                >
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setPendingValue((prev) => ({ date: prev?.date ?? today(getLocalTimeZone()), time: slot }))
                      }
                      className={cx(
                        "w-full shrink-0 cursor-pointer rounded-2lg px-2 py-1.5 text-center text-body-medium text-text-primary transition-colors duration-150 ease",
                        pendingValue?.time === slot
                          ? "bg-background-tertiary-default"
                          : "hover:bg-background-secondary-hover",
                      )}
                    >
                      {formatTime(slot, use24h)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Calendar>
        </Dialog>
      </Popover>
    </>
  );
}
