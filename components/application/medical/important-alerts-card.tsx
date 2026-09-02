"use client";

import { useState } from "react";
import {
  RiAsterisk,
  RiCapsuleFill,
  RiHeartPulseFill,
  RiLungsFill,
  RiMoonClearFill,
  RiTestTubeFill,
} from "@remixicon/react";
import type { ComponentType } from "react";
import { WeekRangePill } from "@/components/application/medical/week-range-pill";
import { cx } from "@/utils/cx";

/**
 * Figma source: Board UI → medical profile dashboard → Frame 126 (node
 * 3950:5936). Alert feed: tinted icon circle, title + description, and a
 * soft date pill absolutely pinned to the row's top-right corner.
 *
 * The feed runs flush to the card's bottom edge and clips there (the card
 * keeps its 10px inset on the other three sides only) — per Figma, where
 * the third alert row is visibly cut off by the card bounds. The scroll
 * content itself ends with a 10px pad so the last alert doesn't sit hard
 * against that edge once you reach the bottom, and a card-colored gradient
 * fades in over the top edge while scrolled so rows dissolve out instead
 * of being sharply cut by the header.
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

type Alert = { icon: IconComponent; iconBg: string; title: string; description: string; date: string };

const ALERTS: Alert[] = [
  {
    icon: RiHeartPulseFill,
    iconBg: "bg-rose-600",
    title: "High Heart rate",
    description:
      "Your heart rate rose above 120 BPM while you seemed to be inactive for 10 minutes starting at 8:59 AM, 12 June.",
    date: "June, 12",
  },
  {
    icon: RiAsterisk,
    iconBg: "bg-amber-400",
    title: "Medical ID",
    description: "Your emergency contact and allergy information was updated in your Medical ID.",
    date: "June, 9",
  },
  {
    icon: RiTestTubeFill,
    iconBg: "bg-emerald-500",
    title: "Lab results ready",
    description: "Your latest blood panel ordered by Dr. Mattheus Clarkson is back — cholesterol and glucose are within the normal range.",
    date: "June, 9",
  },
  {
    icon: RiCapsuleFill,
    iconBg: "bg-blue-400",
    title: "Medication reminder",
    description: "You missed your 9:00 AM dose of Metoprolol. Take it as soon as possible unless your next dose is near.",
    date: "June, 8",
  },
  {
    icon: RiMoonClearFill,
    iconBg: "bg-purple-400",
    title: "Irregular sleep",
    description: "Your bedtime shifted by more than 2 hours on 3 of the last 7 nights, which can affect your sleep score.",
    date: "June, 6",
  },
  {
    icon: RiLungsFill,
    iconBg: "bg-teal-400",
    title: "Low blood oxygen",
    description: "Your blood oxygen dipped to 93% for a short period during sleep on the night of 4 June.",
    date: "June, 5",
  },
];

/** Total alerts logged this week — higher than `ALERTS.length` since the
 *  feed below only lists the most recent ones, not the full history. */
const ALERTS_THIS_WEEK_COUNT = 12;

export function ImportantAlertsCard({ className }: { className?: string } = {}) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <section
      className={cx(
        // The 1px border matches the card's own bg — invisible as a line,
        // but content clips at the padding box (inside the border), so the
        // white alert rows stop 1px shy of the rounded edge instead of
        // touching it when scrolled to the bottom.
        "flex h-[330px] w-full min-w-0 flex-col gap-4 overflow-hidden rounded-[20px] border border-background-secondary-default bg-background-secondary-default px-2.5 pt-2.5",
        className,
      )}
    >
      <div className="flex w-full items-start justify-between gap-2 px-1.5 pt-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-medium text-text-secondary">Important alerts</p>
          <div className="flex items-baseline gap-1">
            <p className="text-title-1-medium whitespace-nowrap text-text-primary tabular-nums">
              {ALERTS_THIS_WEEK_COUNT}
            </p>
            <span className="text-caption-1-medium whitespace-nowrap text-text-secondary">this week</span>
          </div>
        </div>
        <WeekRangePill label="29 Jun - 5 Jul" />
      </div>

      <div className="relative min-h-0 w-full flex-1">
        <div
          className="flex h-full w-full flex-col gap-2.5 overflow-y-auto overscroll-contain pb-2.5"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        >
          {ALERTS.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className="relative flex w-full shrink-0 flex-col gap-2 rounded-2lg bg-background-inner-default p-2.5"
            >
              <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", alert.iconBg)}>
                <alert.icon className="size-[18px] text-white" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-body-medium whitespace-nowrap text-text-primary">{alert.title}</p>
                <p className="text-body-2-regular text-text-secondary">{alert.description}</p>
              </div>
              <span className="absolute top-2.5 right-2.5 rounded-md bg-background-secondary-default px-1.5 py-px text-body-medium whitespace-nowrap text-text-secondary">
                {alert.date}
              </span>
            </div>
          ))}
        </div>
        {/* Top fade — card-colored gradient that eases in once the feed is
            scrolled, so rows dissolve under the header instead of cutting. */}
        <div
          aria-hidden
          className={cx(
            "pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-background-secondary-default to-transparent",
            "transition-opacity duration-200 ease-out",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </section>
  );
}
