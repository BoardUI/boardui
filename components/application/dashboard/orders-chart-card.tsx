"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Chip } from "@/components/base/badges/chip";
import { useCountUp } from "@/hooks/use-count-up";
import { cx } from "@/utils/cx";

/**
 * Orders Chart Card: a year of monthly orders as bars, this year beside last
 * year for every month, so the comparison is read bar to bar rather than
 * against a line. The header is the same as the revenue chart's: a count-up
 * total with a delta chip, the year-earlier figure under it, and a legend.
 * Hovering a month swaps the headline for that month.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type OrdersPoint = {
  /** Short month label on the axis. */
  label: string;
  /** Orders this year. */
  current: number;
  /** Orders in the same month a year earlier. */
  previous: number;
};

/** Twelve months that add up to the stat cards' total orders. */
export const ORDERS_DATA: OrdersPoint[] = [
  { label: "Jan", current: 1680, previous: 1510 },
  { label: "Feb", current: 1740, previous: 1480 },
  { label: "Mar", current: 1920, previous: 1650 },
  { label: "Apr", current: 1850, previous: 1620 },
  { label: "May", current: 2040, previous: 1710 },
  { label: "Jun", current: 2110, previous: 1760 },
  { label: "Jul", current: 2290, previous: 1840 },
  { label: "Aug", current: 2180, previous: 1890 },
  { label: "Sep", current: 2320, previous: 1930 },
  { label: "Oct", current: 2410, previous: 1970 },
  { label: "Nov", current: 2280, previous: 1810 },
  { label: "Dec", current: 2342, previous: 1798 },
];

const formatK = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `${value}`);

function describeDelta(current: number, previous: number) {
  if (previous === 0) return { label: "New", color: "neutral" as const };
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return { label: "0%", color: "neutral" as const };
  return {
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
    color: rounded > 0 ? ("lime" as const) : ("rose" as const),
  };
}

export function OrdersChartCard({
  data = ORDERS_DATA,
  title = "Orders",
  className,
}: {
  /** Twelve points, one per month; defaults to the demo year. */
  data?: OrdersPoint[];
  /** Headline label when no month is hovered. */
  title?: string;
  className?: string;
} = {}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalCurrent = data.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = data.reduce((sum, point) => sum + point.previous, 0);
  const hovering = activeIndex !== null && activeIndex < data.length;
  const point = hovering ? data[activeIndex] : null;

  const headlineValue = point ? point.current : totalCurrent;
  const comparison = point ? point.previous : totalPrevious;
  const delta = describeDelta(headlineValue, comparison);
  const monthIndex = point ? MONTHS.indexOf(point.label) : -1;
  const label = point ? (monthIndex >= 0 ? MONTHS_FULL[monthIndex] : point.label) : title;
  const display = useCountUp(headlineValue);

  const yMax = Math.max(...data.map((d) => Math.max(d.current, d.previous)));

  return (
    <section
      className={cx(
        "flex h-[344px] min-w-0 flex-1 flex-col gap-6 rounded-2xl bg-background-secondary-default px-4 pt-4 pb-3",
        className,
      )}
    >
      {/* Header: label over the count-up figure and its delta; legend on the right */}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="w-full text-body-medium text-text-secondary">{label}</p>
          <div className="flex w-full items-center gap-2">
            <p
              key={activeIndex ?? "total"}
              className="animate-number-fade text-title-1-medium whitespace-nowrap text-text-primary tabular-nums"
            >
              {display.toLocaleString("en-US")}
            </p>
            <Chip variant="bold" color={delta.color}>
              {delta.label}
            </Chip>
          </div>
          <p className="text-body-2-medium text-text-tertiary tabular-nums">
            {comparison.toLocaleString("en-US")} {point ? "a year earlier" : "last year"}
          </p>
        </div>
        <dl className="flex shrink-0 items-center gap-4 text-body-2-medium text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-9-active" aria-hidden />
            <dt>This year</dt>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-neutral" aria-hidden />
            <dt>Last year</dt>
          </div>
        </dl>
      </div>

      {/* Chart */}
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
            barCategoryGap="28%"
            barGap={3}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              if (state?.isTooltipActive && Number.isFinite(index)) setActiveIndex(index);
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <YAxis
              width={40}
              domain={[0, yMax * 1.1]}
              tickCount={4}
              tickFormatter={formatK}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              interval="preserveStartEnd"
              tick={{ fontSize: 13, fill: "var(--color-text-tertiary)" }}
            />
            <Tooltip content={() => null} cursor={{ fill: "var(--color-chart-track)", opacity: 0.5 }} />
            <Bar
              dataKey="previous"
              fill="var(--color-chart-neutral)"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={450}
            />
            <Bar
              dataKey="current"
              fill="var(--color-chart-9-active)"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={450}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
