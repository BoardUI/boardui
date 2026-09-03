"use client";

import { useEffect, useRef, useState } from "react";
import { RiAddLine, RiArrowRightSLine, RiCheckboxCircleFill, RiDeleteBinLine, RiFileTextLine, RiFolder3Line, RiHome5Line, RiMailLine, RiSearchLine, RiSettings3Line, RiUserLine } from "@remixicon/react";
import { AgentThinkingPreview, DataTablePreview, DropdownPreview, FileUploadPreview, MeetingSchedulePreview, SidebarPreview } from "@/components/application/docs/free-landing-previews";
import type { PreviewHref } from "@/components/application/docs/component-preview-hrefs";
import { AgentChat } from "@/components/application/agent-chat/agent-chat";
import { AuthCard } from "@/components/application/auth/auth-card";
import { NotificationCenterDemo } from "@/components/application/notification-center/notification-center-demo";
import { SettingsGeneral } from "@/components/application/settings/settings-general";
import { OrdersChartCard } from "@/components/application/dashboard/orders-chart-card";
import { RevenueChartCard } from "@/components/application/dashboard/revenue-chart-card";
import { StatCards } from "@/components/application/dashboard/stat-cards";
import { Announcement } from "@/components/base/announcement/announcement";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Breadcrumb, BreadcrumbItem } from "@/components/base/breadcrumb/breadcrumb";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/buttons/button-group";
import { CloseButton } from "@/components/base/buttons/close-button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { LinkButton } from "@/components/base/buttons/link-button";
import { Carousel, CarouselItem } from "@/components/base/carousel/carousel";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Divider } from "@/components/base/divider/divider";
import { Notification } from "@/components/base/notification/notification";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { Tab, TabList, Tabs } from "@/components/base/tabs/tabs";
import { Input } from "@/components/base/input/input";
import { InputOtp } from "@/components/base/input-otp/input-otp";
import { Pagination } from "@/components/base/pagination/pagination";
import { Radio, RadioGroup } from "@/components/base/radio/radio";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { Select, SelectItem } from "@/components/base/select/select";
import { Slider } from "@/components/base/slider/slider";
import { SocialButton } from "@/components/base/social-button/social-button";
import { Switch } from "@/components/base/switch/switch";
import { TOOLTIP_CARETS } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

/**
 * Live previews of the free components, for the docs index and the starter's
 * Components page. Nothing here may import a Pro component: the starter
 * ships this file.
 */
/** Centres a small component in the card's preview area. */
function Center({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/**
 * Numeric scale, measured with JavaScript.
 *
 * The CSS route — `scale(calc(tan(atan2(<length>, <length>))))` — resolves in
 * Blink but not in iOS WebKit, where the whole transform drops and the charts
 * and templates painted unscaled or not at all on a real iPhone (a narrowed
 * desktop window never showed it, because that is still Blink). The inline
 * expressions stay as the first paint's best effort; once mounted, this
 * observer supplies a plain number every engine accepts, and re-supplies it on
 * resize and on the `sm` breakpoint flip.
 */
function useMeasuredScale(compute: (available: number, sm: boolean) => number) {
  const ref = useRef<HTMLDivElement>(null);
  const computeRef = useRef(compute);
  const [scale, setScale] = useState<number | null>(null);

  // Kept fresh in an effect rather than during render, which the lint rule
  // rightly flags; the observer only ever fires after mount anyway.
  useEffect(() => {
    computeRef.current = compute;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = window.matchMedia("(min-width: 640px)");
    const measure = () => {
      const available = el.clientWidth;
      if (available > 0) setScale(computeRef.current(available, media.matches));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    media.addEventListener("change", measure);
    measure();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", measure);
    };
  }, []);

  return { ref, scale };
}

/**
 * Per-width fit expressions for `Scaled`, written out as literal class strings
 * so Tailwind can see and generate them — an interpolated arbitrary value
 * never makes it into the stylesheet.
 *
 * Mobile fills 92% of the card, `sm:` and up the full width, both capped at
 * the chart's natural size so the square charts don't blow up past 1:1 on the
 * wide tablet cards.
 */
const SCALED_FIT: Record<number, string> = {
  330: "[--sc-fit:min(calc((100cqw_-_16px)*0.92),330px)] sm:[--sc-fit:min(calc((100cqw_-_16px)*1),330px)]",
  404: "[--sc-fit:min(calc((100cqw_-_16px)*0.92),404px)] sm:[--sc-fit:min(calc((100cqw_-_16px)*1),404px)]",
  560: "[--sc-fit:min(calc((100cqw_-_16px)*0.92),560px)] sm:[--sc-fit:min(calc((100cqw_-_16px)*1),560px)]",
};

/**
 * The `insetRight` counterpart: from `sm:` up the chart clears 16px on both
 * sides, so the fit has to give back 32px rather than 16px or it would paint
 * straight through the new right padding.
 */
const SCALED_FIT_INSET: Record<number, string> = {
  330: "[--sc-fit:min(calc((100cqw_-_16px)*0.92),330px)] sm:[--sc-fit:min(calc(100cqw_-_32px),330px)]",
};

/**
 * Scales a full-size card into the preview area.
 *
 * Padded on the left only by default, so the card runs to the right edge of
 * the container rather than sitting in a box, which is how the landing's own
 * previews read. `insetRight` opts a chart into matching padding on the right
 * — the self-contained square charts read as cropped without it, where the
 * wide ones are meant to bleed. The fit expression trims the card back from
 * filling the full width, leaving it a little air; the bottom is covered by
 * the card's fade rather than a hard cut. New widths must be added to
 * `SCALED_FIT`.
 */
export function Scaled({
  width,
  insetRight = false,
  children,
}: {
  width: number;
  insetRight?: boolean;
  children: React.ReactNode;
}) {
  // The wrapper's own clientWidth already accounts for the insets — its
  // `left-4` / `sm:right-4` classes are what the CSS expressions subtracted.
  // Mobile leaves a right inset equal to the wrapper's 16px left one, so the
  // two gaps match instead of the ~8% remainder all falling on the right.
  // `sm:` and up keeps the full-width bleed the desktop cards were tuned to.
  const { ref, scale } = useMeasuredScale((available, sm) =>
    Math.min(sm ? available : Math.max(available - 16, 1), width) / width,
  );

  return (
    <div
      ref={ref}
      className={`absolute inset-y-0 top-4 left-4 overflow-hidden ${
        insetRight ? "right-0 sm:right-4" : "right-0"
      }`}
    >
      {/* The calc casts the length ratio to the number `scale()` demands;
          the measured value replaces it after mount (see useMeasuredScale). */}
      <div
        className={`origin-top-left ${(insetRight ? SCALED_FIT_INSET[width] : SCALED_FIT[width]) ?? ""}`}
        style={{
          width,
          transform:
            scale === null
              ? `scale(calc(tan(atan2(var(--sc-fit), ${width}px))))`
              : `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A whole template screen, centred and scaled into the preview area.
 *
 * The 1280×855 canvas is the template detail page's own preview viewport, so a
 * template shows the same slice of itself here as it does there — the full
 * screen, not a crop. The card grows to hold the painted height (see
 * `TEMPLATE_CARD` below); border and radius are drawn oversized so they land
 * at roughly 1px / 12px after the ~0.33 scale.
 */
export function TemplateFrame({ children }: { children: React.ReactNode }) {
  // Mirrors the CSS: a 390 canvas capped at 300px painted below `sm`, the
  // 1280 canvas filling the card minus 12px each side above it.
  const { ref, scale } = useMeasuredScale((available, sm) =>
    sm ? (available - 24) / 1280 : Math.min(available - 24, 300) / 390,
  );

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* The scale is the tan(atan2()) length-to-number cast — see `Scaled`.
          `--tpl-fit` keeps 12px of clear card on every side of the frame.

          Below `sm` the canvas is a 390×844 phone instead of the 1280×855
          desktop: the shells read the real viewport's media queries, so on a
          phone they lay out as phones, and painting that into a desktop-wide
          canvas is what produced the half-empty hybrid. The phone frame is
          also capped at 300px painted so it reads as a device, not a
          full-bleed stretch. */}
      <div
        // The subtractions live in explicit `calc()` with spaced operators:
        // bare `100cqw-24px` tokenizes as one junk unit and killed the whole
        // transform at desktop. `--template-preview-height` is the variable
        // the shells size themselves by (the template detail page sets it
        // too) — without it the chat shells fall back to content height and
        // leave the bottom of the canvas empty.
        className={
          "shrink-0 overflow-hidden rounded-[34px] border-[3px] border-border-button-default " +
          "h-[844px] w-[390px] [--tpl-w:390px] [--tpl-fit:min(calc(100cqw_-_24px),300px)] [--template-preview-height:844px] " +
          "sm:h-[855px] sm:w-[1280px] sm:[--tpl-w:1280px] sm:[--tpl-fit:calc(100cqw_-_24px)] sm:[--template-preview-height:855px]"
        }
        style={{
          transform:
            scale === null
              ? "scale(calc(tan(atan2(var(--tpl-fit), var(--tpl-w)))))"
              : `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The hand-rolled cousin of `Scaled` for previews with their own factor —
 * same measured-scale override, same top-left anchoring. `fullBleed` drops
 * the left inset so the content starts at the card's very edge (the table).
 */
function InlineScaled({
  width,
  factor,
  fullBleed = false,
  children,
}: {
  width: number;
  factor: number;
  fullBleed?: boolean;
  children: React.ReactNode;
}) {
  // Same equal-inset rule for the hand-scaled previews. The preview's own
  // trim (`factor`) is a desktop tuning: on a phone it was the leftover on
  // the right, so below `sm` the content fills to the matching inset.
  const { ref, scale } = useMeasuredScale(
    (available, sm) =>
      (Math.max(fullBleed ? available : available - 16, 1) * (sm ? factor : 1)) / width,
  );

  return (
    <div
      ref={ref}
      className={
        fullBleed
          ? "absolute inset-0 overflow-hidden"
          : "absolute inset-y-0 top-4 right-0 left-4 overflow-hidden"
      }
    >
      <div
        className="origin-top-left"
        style={{
          width,
          transform:
            scale === null
              ? `scale(calc(tan(atan2((100cqw${fullBleed ? "" : " - 16px"}) * ${factor}, ${width}px))))`
              : `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Card sizing for the template cards: the preview area takes exactly the
 * height the scaled screen paints — fit width × canvas aspect — plus the 12px
 * of padding above and below it, and the card stops being fixed-height so the
 * text block sits under whatever that works out to. The mobile height follows
 * the phone canvas, `sm:` the desktop one; it repeats under `xl:` because the
 * base card sets its own `xl:` heights, which a bare override would leave
 * standing.
 */
export const TEMPLATE_CARD = {
  className: "h-auto xl:h-auto",
  previewClassName:
    "h-[calc(min(100cqw-24px,300px)*844/390+24px)] sm:h-[calc((100cqw-24px)*855/1280+24px)] xl:h-[calc((100cqw-24px)*855/1280+24px)]",
};

/**
 * Hover state of the card an element sits in.
 *
 * The card's full-bleed link overlay swallows pointer events, so an inner
 * component never sees its own `mouseenter`. The article underneath still
 * fires, and the landing's CSS animations key off exactly that
 * (`group-hover/card:`); this is the same signal for previews whose demo
 * needs JavaScript rather than a transition.
 */
function useCardHover() {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const card = ref.current?.closest("article");
    if (!card) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    return () => {
      card.removeEventListener("mouseenter", enter);
      card.removeEventListener("mouseleave", leave);
    };
  }, []);

  return { ref, hovered };
}

function CheckboxPreview() {
  return (
    <Center>
      <div className="flex flex-col gap-3">
        <Checkbox defaultSelected>Selected</Checkbox>
        <Checkbox>Unselected</Checkbox>
        <Checkbox isIndeterminate>Indeterminate</Checkbox>
      </div>
    </Center>
  );
}

/** On hover, selection walks the options top to bottom and wraps. */
function RadioPreview() {
  const { ref, hovered } = useCardHover();
  const [value, setValue] = useState("weekly");

  useEffect(() => {
    if (!hovered) return;
    const order = ["weekly", "monthly", "yearly"];
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % order.length;
      setValue(order[i]);
    }, 900);
    return () => {
      window.clearInterval(id);
      setValue("weekly");
    };
  }, [hovered]);

  return (
    <Center>
      <RadioGroup
        ref={ref}
        value={value}
        onChange={setValue}
        aria-label="Frequency"
        className="flex flex-col gap-3"
      >
        <Radio value="weekly">Weekly</Radio>
        <Radio value="monthly">Monthly</Radio>
        <Radio value="yearly">Yearly</Radio>
      </RadioGroup>
    </Center>
  );
}

/** On hover, the switches take turns flipping: first one, then the other. */
function SwitchPreview() {
  const { ref, hovered } = useCardHover();
  const [on, setOn] = useState([true, false]);

  useEffect(() => {
    if (!hovered) return;
    let turn = 0;
    const id = window.setInterval(() => {
      const idx = turn % 2;
      setOn((prev) => prev.map((v, i) => (i === idx ? !v : v)));
      turn += 1;
    }, 700);
    return () => {
      window.clearInterval(id);
      setOn([true, false]);
    };
  }, [hovered]);

  return (
    <Center>
      <div ref={ref} className="flex flex-col items-start gap-4">
        <Switch isSelected={on[0]} onChange={(v) => setOn((p) => [v, p[1]])} aria-label="First" />
        <Switch isSelected={on[1]} onChange={(v) => setOn((p) => [p[0], v])} aria-label="Second" />
      </div>
    </Center>
  );
}

/** On hover: the thumb nudges right, sweeps left, and settles back home. */
function SliderPreview() {
  const { ref, hovered } = useCardHover();
  const [value, setValue] = useState(62);

  useEffect(() => {
    if (!hovered) return;
    const frames = [
      { t: 0, v: 62 },
      { t: 600, v: 79 },
      { t: 1500, v: 31 },
      { t: 2250, v: 62 },
    ];
    const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      const i = frames.findIndex((f) => f.t > t);
      if (i === -1) {
        setValue(62);
        return;
      }
      const a = frames[i - 1];
      const b = frames[i];
      setValue(Math.round(a.v + (b.v - a.v) * ease((t - a.t) / (b.t - a.t))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  return (
    <Center>
      <div ref={ref} className="w-full max-w-[220px]">
        <Slider value={value} onChange={(v) => setValue(v as number)} thumbLabel="Value" />
      </div>
    </Center>
  );
}

/**
 * While the card is hovered the carousel walks its slides, wrapping back to
 * the first when it runs out, for as long as the pointer stays. The component
 * has no controlled-index API (deliberately — it's a scroll-snap track), so
 * the demo drives the same scroll the arrow buttons do.
 */
function CarouselPreviewCard() {
  const { ref, hovered } = useCardHover();

  useEffect(() => {
    if (!hovered) return;
    const track = ref.current?.querySelector<HTMLElement>(".overflow-x-auto");
    if (!track) return;
    const step = () => {
      const kids = Array.from(track.children) as HTMLElement[];
      if (kids.length < 2) return;
      const stride = kids[1].offsetLeft - kids[0].offsetLeft;
      const next = (Math.round(track.scrollLeft / stride) + 1) % kids.length;
      track.scrollTo({
        left: kids[next].offsetLeft - kids[0].offsetLeft,
        behavior: "smooth",
      });
    };
    const first = window.setTimeout(step, 400);
    const rest = window.setInterval(step, 1500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(rest);
    };
  }, [hovered, ref]);

  return (
    <Center>
      <div ref={ref} className="w-full max-w-[240px]">
        <Carousel aria-label="Preview" showArrows={false}>
          {["kitchen", "space-squid", "sunrise"].map((name) => (
            <CarouselItem key={name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/carousel/${name}.webp`}
                alt=""
                className="h-[110px] w-full rounded-2lg object-cover"
              />
            </CarouselItem>
          ))}
        </Carousel>
      </div>
    </Center>
  );
}

/**
 * On hover the filled code deletes right-to-left, a new one types in
 * digit-by-digit, and a small success line confirms it — the whole lifecycle
 * of the component in one pass. Leaving the card resets it for the next pass.
 */
function InputOtpPreviewCard() {
  const { ref, hovered } = useCardHover();
  const [value, setValue] = useState("204915");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    const CODE = "731428";
    const timers: number[] = [];
    let delay = 400;
    for (let remaining = 5; remaining >= 0; remaining--) {
      const next = "204915".slice(0, remaining);
      timers.push(window.setTimeout(() => setValue(next), delay));
      delay += 160;
    }
    delay += 300;
    for (let typed = 1; typed <= CODE.length; typed++) {
      const next = CODE.slice(0, typed);
      timers.push(window.setTimeout(() => setValue(next), delay));
      delay += 240;
    }
    delay += 400;
    timers.push(window.setTimeout(() => setVerified(true), delay));
    // Cleanup doubles as the reset: leaving the card puts the original code
    // back so the next hover replays the whole pass.
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      setValue("204915");
      setVerified(false);
    };
  }, [hovered]);

  // The box the demo is "in": deletion clears down to this index, typing fills
  // it next. The component's real active state is `:focus-visible`, which a
  // scripted demo can't hold without stealing the page's focus, so the ring is
  // drawn as an overlay that slides between boxes instead — same classes as
  // the input's own focus ring, minus the focus.
  const activeIndex = Math.min(value.length, 5);

  return (
    <Center>
      <div ref={ref} className="relative scale-[0.82]">
        <InputOtp value={value} onChange={setValue} aria-label="Verification code" />
        <div
          aria-hidden
          className={`pointer-events-none absolute top-0 size-12 rounded-2lg border border-border-focus-ring ring-2 ring-border-focus-ring transition-[left,opacity] duration-200 ease ${hovered && !verified ? "opacity-100" : "opacity-0"}`}
          style={{ left: activeIndex * 56 }}
        />
      </div>
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-4 flex items-center justify-center gap-1 text-caption-1-medium text-notification-success-foreground transition-opacity duration-300 ${verified ? "opacity-100" : "opacity-0"}`}
      >
        <RiCheckboxCircleFill className="size-4" />
        Code verified
      </div>
    </Center>
  );
}

/**
 * The four tails, all visible at once, instead of a button you have to hover.
 *
 * Drawn inline rather than through `TooltipTrigger`: a real tooltip renders in
 * a portal on `document.body`, so four permanently-open ones would float above
 * the whole page — over neighbouring cards and the sticky nav — instead of
 * sitting in this card. The caret geometry comes from the component's own
 * `TOOLTIP_CARETS`, so the tails cannot drift from the real thing.
 *
 * `placement` names where the tooltip sits relative to its trigger, so the
 * tail points the opposite way: `top` hangs its caret off the bottom edge.
 */
const TOOLTIP_TAIL_POSITION = {
  top: "top-full left-1/2 -translate-x-1/2",
  bottom: "bottom-full left-1/2 -translate-x-1/2",
  left: "left-full top-1/2 -translate-y-1/2",
  right: "right-full top-1/2 -translate-y-1/2",
} as const;

function TooltipBubble({
  placement,
  children,
}: {
  placement: keyof typeof TOOLTIP_TAIL_POSITION;
  children: React.ReactNode;
}) {
  const caret = TOOLTIP_CARETS[placement];
  return (
    <div className="relative w-fit rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 text-caption-1-medium text-text-primary shadow-dropdown">
      {children}
      <svg
        aria-hidden
        width={caret.width}
        height={caret.height}
        viewBox={`0 0 ${caret.width} ${caret.height}`}
        className={cx(
          "absolute block overflow-visible fill-background-primary-default stroke-border-button-default",
          TOOLTIP_TAIL_POSITION[placement],
        )}
        style={{ filter: `drop-shadow(${caret.shadow} rgb(0 0 0 / 0.05))` }}
      >
        <path d={caret.path} />
      </svg>
    </div>
  );
}

function TooltipPreviewCard() {
  return (
    <Center>
      <div className="grid grid-cols-2 place-items-center gap-x-5 gap-y-6">
        <TooltipBubble placement="top">Top</TooltipBubble>
        <TooltipBubble placement="bottom">Bottom</TooltipBubble>
        <TooltipBubble placement="left">Left</TooltipBubble>
        <TooltipBubble placement="right">Right</TooltipBubble>
      </div>
    </Center>
  );
}

/**
 * On hover the two fields fill themselves in turn: an email address types
 * into the first, then a query into the second, each showing the active ring
 * while it is being written.
 *
 * The ring is painted through `fieldClassName` rather than by focusing the
 * input for real: a scripted `.focus()` would steal the caret from whatever
 * the visitor was doing and scroll the card into view. `fieldClassName` is
 * last in the field's own `cx` chain, so it wins over the resting ring.
 */
function InputPreviewCard() {
  const { ref, hovered } = useCardHover();
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<"none" | "email" | "query">("none");

  useEffect(() => {
    if (!hovered) return;
    const EMAIL = "hello@boardui.com";
    const QUERY = "data table";
    const timers: number[] = [];
    let delay = 350;

    timers.push(window.setTimeout(() => setActive("email"), delay));
    delay += 220;
    for (let i = 1; i <= EMAIL.length; i++) {
      const next = EMAIL.slice(0, i);
      timers.push(window.setTimeout(() => setEmail(next), delay));
      delay += 55;
    }

    // Beat between the two fields, so the hand-off is legible.
    delay += 550;
    timers.push(window.setTimeout(() => setActive("query"), delay));
    delay += 220;
    for (let i = 1; i <= QUERY.length; i++) {
      const next = QUERY.slice(0, i);
      timers.push(window.setTimeout(() => setQuery(next), delay));
      delay += 75;
    }
    delay += 500;
    timers.push(window.setTimeout(() => setActive("none"), delay));

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      setEmail("");
      setQuery("");
      setActive("none");
    };
  }, [hovered]);

  const ring = (field: "email" | "query") =>
    active === field ? "ring-border-button-active" : undefined;

  return (
    <Center>
      <div ref={ref} className="flex w-full max-w-[230px] flex-col gap-3">
        <Input
          placeholder="you@company.com"
          leadingIcon={RiMailLine}
          value={email}
          onChange={setEmail}
          fieldClassName={ring("email")}
        />
        <Input
          placeholder="Search"
          leadingIcon={RiSearchLine}
          value={query}
          onChange={setQuery}
          fieldClassName={ring("query")}
        />
      </div>
    </Center>
  );
}

/**
 * The Select trigger at rest. The card previously showed an `Input` here,
 * which is a different component entirely.
 */
function SelectPreviewCard() {
  return (
    <Center>
      <div className="w-full max-w-[168px]">
        <Select aria-label="Framework" defaultSelectedKey="react">
          <SelectItem id="react">React</SelectItem>
          <SelectItem id="vue">Vue</SelectItem>
          <SelectItem id="svelte">Svelte</SelectItem>
        </Select>
      </div>
    </Center>
  );
}

export type PreviewOptions = {
    fade?: boolean;
    fadeClassName?: string;
    fadeOnHover?: "sidebar" | "dropdown";
    releaseOverflowAfter?: number;
    className?: string;
    previewClassName?: string;
  };

export const FREE_PREVIEW_OPTIONS: Record<string, PreviewOptions> = {
  "/components/data-table": { fade: true },
  "/components/sidebar": { fade: true, fadeOnHover: "sidebar", releaseOverflowAfter: 1150 },
  "/components/dropdown": { fade: true, fadeOnHover: "dropdown", releaseOverflowAfter: 525 },
  "/components/date-picker": { fade: true },
  // Scaled chart cards, all taller than the preview area,
  "/components/stat-cards": { fade: true },
  "/components/orders-chart-card": {
    fade: true,
    className: "max-sm:h-[294px]",
    previewClassName: "max-sm:h-[192px]",
  },
  "/components/revenue-chart-card": {
    fade: true,
    className: "max-sm:h-[294px]",
    previewClassName: "max-sm:h-[192px]",
  },
  "/components/table": { fade: true },
  "/components/notification-center": { fade: true },
  "/components/settings-modal": { fade: true },
  "/components/auth-card": { fade: true },
  "/components/chat-starter": TEMPLATE_CARD,
};

export const FREE_COMPONENT_PREVIEWS: Partial<Record<PreviewHref, () => React.ReactElement>> = {
  "/components/data-table": DataTablePreview,
  "/components/stat-cards": () => (
    <Scaled width={330} insetRight>
      <StatCards variant="footer" count={1} columns={1} />
    </Scaled>
  ),
  "/components/sidebar": SidebarPreview,
  "/components/dropdown": DropdownPreview,
  "/components/chat-starter": () => (
    <TemplateFrame>
      <AgentChat contained />
    </TemplateFrame>
  ),
  "/components/date-picker": MeetingSchedulePreview,
  "/components/file-upload": FileUploadPreview,

  // ——— charts: one card each, not the landing's marquees ———,
  "/components/orders-chart-card": () => (
    <Scaled width={560}>
      <OrdersChartCard />
    </Scaled>
  ),
  "/components/revenue-chart-card": () => (
    <Scaled width={560}>
      <RevenueChartCard />
    </Scaled>
  ),
  "/components/color": () => (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* A painter's strip per hue — each column runs down its own scale, and
          the alternating offsets keep it from reading as a spreadsheet. */}
      <div className="flex items-center gap-2">
        {[
          ["bg-blue-300", "bg-blue-400", "bg-blue-500", "bg-blue-600"],
          ["bg-violet-300", "bg-violet-400", "bg-violet-500", "bg-violet-600"],
          ["bg-rose-300", "bg-rose-400", "bg-rose-500", "bg-rose-600"],
          ["bg-amber-300", "bg-amber-400", "bg-amber-500", "bg-amber-600"],
          ["bg-lime-300", "bg-lime-400", "bg-lime-500", "bg-lime-600"],
          ["bg-cyan-300", "bg-cyan-400", "bg-cyan-500", "bg-cyan-600"],
        ].map((scale, i) => (
          <div
            key={scale[0]}
            className={`flex flex-col overflow-hidden rounded-full ${i % 2 ? "translate-y-2.5" : "-translate-y-2.5"}`}
          >
            {scale.map((tone) => (
              <span key={tone} className={`h-8 w-7 ${tone}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  ),
  "/components/typography": () => (
    <div className="absolute inset-0 flex flex-col justify-center gap-1 overflow-hidden pl-6">
      <span className="text-display-4-semibold text-text-primary">Display</span>
      <span className="text-title-2-medium text-text-primary">Title</span>
      <span className="text-headline-medium text-text-secondary">Headline</span>
      <span className="text-body-regular text-text-tertiary">Body regular</span>
      <span className="font-mono text-caption-1-medium text-text-tertiary">Mono caption</span>
    </div>
  ),

  // ——— base components, one representative instance each ———,
  "/components/notification": () => (
    <Center>
      <div className="w-full max-w-[268px]">
        <Notification
          status="success"
          title="Deployment finished"
          description="boardui.com is live on production."
          timestamp="2m ago"
        />
      </div>
    </Center>
  ),
  "/components/table": () => (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deliberately unscaled: the table reads better at its real size,
          running off the right edge, than shrunk to fit the card. */}
      <div className="w-[520px] origin-top-left">
        <Table aria-label="Customers">
          <TableHeader>
            <TableColumn id="name" isRowHeader>
              Name
            </TableColumn>
            <TableColumn id="role">Role</TableColumn>
            <TableColumn id="status">Status</TableColumn>
          </TableHeader>
          <TableBody>
            <TableRow id="1">
              <TableCell>Olivia Rhye</TableCell>
              <TableCell>Product Designer</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
            <TableRow id="2">
              <TableCell>Phoenix Baker</TableCell>
              <TableCell>Engineer</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
            <TableRow id="3">
              <TableCell>Lana Steiner</TableCell>
              <TableCell>Design Lead</TableCell>
              <TableCell>Invited</TableCell>
            </TableRow>
            <TableRow id="4">
              <TableCell>Demi Wilkinson</TableCell>
              <TableCell>Frontend Engineer</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  ),
  "/components/tabs": () => (
    <Center>
      <Tabs defaultSelectedKey="components">
        <TabList aria-label="Sections">
          <Tab id="components" count={48}>
            Components
          </Tab>
          <Tab id="blocks" count={6}>
            Blocks
          </Tab>
          <Tab id="charts">Charts</Tab>
        </TabList>
      </Tabs>
    </Center>
  ),
  "/components/notification-center": () => (
    <InlineScaled width={400} factor={0.92}>
      <NotificationCenterDemo />
    </InlineScaled>
  ),
  "/components/auth-card": () => (
    <InlineScaled width={400} factor={0.95}>
      <AuthCard layout="inline" providers={["google", "apple", "github", "x"]} />
    </InlineScaled>
  ),

  // ——— blocks: both cards the landing shows too, imported not rebuilt ———,
  "/components/agent-thinking": AgentThinkingPreview,
  "/components/settings-modal": () => (
    <InlineScaled width={560} factor={0.9}>
      <SettingsGeneral planArtSrc="/templates/settings-plan-art.png" />
    </InlineScaled>
  ),
  "/components/announcement": () => (
    <Center>
      <div className="w-full max-w-[260px]">
        <Announcement
          title="Two new components"
          description="Carousel and Input OTP are installable through the CLI today."
          actionLabel="See what's new"
          dismissible
        />
      </div>
    </Center>
  ),
  // Overlapped stack that fans apart on hover — the group is how avatars
  // actually appear in the templates, and the spread is what makes the
  // stacking order readable. Each tile also lifts, staggered left to right,
  // so the motion has a direction instead of everything moving at once.,
  "/components/avatar": () => (
    <Center>
      <div className="flex items-center">
        {[
          { src: "/avatars/john-clarkson.webp", alt: "John Clarkson", initials: undefined },
          { src: "/avatars/aspen-lubin.webp", alt: "Aspen Lubin", initials: undefined },
          { src: "/avatars/kianna-vaccaro.webp", alt: "Kianna Vaccaro", initials: undefined },
          { src: undefined, alt: "Mertcan Esmergul", initials: "M" },
        ].map((person, i) => (
          <div
            key={person.alt}
            className={cx(
              "rounded-full ring-2 ring-background-primary-default transition-[translate,scale] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]",
              i > 0 && "-ml-3",
              // Fan out symmetrically around the centre — the outer pair
              // travels 27px, the inner pair 9px — so the group spreads in
              // place instead of drifting right off the middle of the card.
              i === 0 && "sm:group-hover/card:-translate-x-[27px]",
              i === 1 && "sm:group-hover/card:-translate-x-[9px]",
              i === 2 && "sm:group-hover/card:translate-x-[9px]",
              i === 3 && "sm:group-hover/card:translate-x-[27px]",
              "sm:group-hover/card:-translate-y-1 sm:group-hover/card:scale-105",
            )}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <Avatar size="lg" color="blue" src={person.src} initials={person.initials} alt={person.alt} />
          </div>
        ))}
      </div>
    </Center>
  ),
  // Packed like a tag cloud: chips flow inline at their own intrinsic width
  // and wrap, so each row holds a different number of them and the edges stay
  // ragged. CSS columns were tried first and read as a plain grid — every
  // chip is the same height, so the columns just re-aligned into rows. Mixing
  // the three variants varies the height too, which is what actually gives
  // the rows their stagger.,
  "/components/chip": () => (
    <Center>
      <div className="flex max-w-[248px] flex-wrap items-center justify-center gap-1.5">
        {[
          { color: "lime", label: "Completed", variant: "bold" },
          { color: "yellow", label: "Waiting", variant: "subtle" },
          { color: "purple", label: "+14.8%", variant: "bold" },
          { color: "cyan", label: "Confirmed", variant: "caption" },
          { color: "rose", label: "Failed", variant: "bold" },
          { color: "blue", label: "In review", variant: "subtle" },
          { color: "gray", label: "v2.4.0", variant: "caption" },
          { color: "neutral", label: "Draft", variant: "bold" },
          { color: "lime", label: "Live", variant: "subtle" },
          { color: "rose", label: "-3.2%", variant: "caption" },
          { color: "purple", label: "Beta", variant: "bold" },
          { color: "soft", label: "Archived", variant: "subtle" },
        ].map((chip) => (
          <Chip
            key={chip.label}
            color={chip.color as "lime"}
            variant={chip.variant as "bold"}
          >
            {chip.label}
          </Chip>
        ))}
      </div>
    </Center>
  ),
  "/components/breadcrumb": () => (
    <Center>
      <div className="flex flex-col items-start gap-2">
        <Breadcrumb>
          <BreadcrumbItem href="/">Home</BreadcrumbItem>
          <BreadcrumbItem href="/components">Team</BreadcrumbItem>
          <BreadcrumbItem current>Billing</BreadcrumbItem>
        </Breadcrumb>
        <Breadcrumb>
          <BreadcrumbItem href="/">Library</BreadcrumbItem>
          <BreadcrumbItem href="/components">Charts</BreadcrumbItem>
          <BreadcrumbItem current>Revenue</BreadcrumbItem>
        </Breadcrumb>
        <Breadcrumb>
          <BreadcrumbItem href="/" icon={RiHome5Line}>
            Home
          </BreadcrumbItem>
          <BreadcrumbItem href="/components" icon={RiSettings3Line}>
            Settings
          </BreadcrumbItem>
          <BreadcrumbItem current icon={RiUserLine}>
            Profile
          </BreadcrumbItem>
        </Breadcrumb>
        <Breadcrumb>
          <BreadcrumbItem href="/" icon={RiFolder3Line}>
            Files
          </BreadcrumbItem>
          <BreadcrumbItem href="/components" icon={RiFolder3Line}>
            Design
          </BreadcrumbItem>
          <BreadcrumbItem current icon={RiFileTextLine}>
            Brief
          </BreadcrumbItem>
        </Breadcrumb>
      </div>
    </Center>
  ),
  "/components/button": () => (
    <Center>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Button leadingIcon={RiAddLine}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" leadingIcon={RiDeleteBinLine}>
            Delete
          </Button>
        </div>
      </div>
    </Center>
  ),
  "/components/button-group": () => (
    <Center>
      <ButtonGroup aria-label="Range">
        <ButtonGroupItem>Day</ButtonGroupItem>
        <ButtonGroupItem selected>Week</ButtonGroupItem>
        <ButtonGroupItem>Month</ButtonGroupItem>
      </ButtonGroup>
    </Center>
  ),
  "/components/carousel": CarouselPreviewCard,
  "/components/checkbox": CheckboxPreview,
  "/components/close-button": () => (
    <Center>
      <div className="flex items-center gap-3">
        <CloseButton size="xs" aria-label="Close" />
        <CloseButton size="sm" aria-label="Close" />
        <CloseButton size="md" aria-label="Close" />
      </div>
    </Center>
  ),
  "/components/divider": () => (
    <Center>
      <div className="flex w-full max-w-[220px] flex-col gap-5">
        <Divider />
        <Divider>or</Divider>
      </div>
    </Center>
  ),
  "/components/icon-button": () => (
    <Center>
      <div className="flex items-center gap-2">
        <IconButton icon={RiAddLine} aria-label="Add" />
        <IconButton icon={RiSearchLine} aria-label="Search" />
        <IconButton icon={RiDeleteBinLine} aria-label="Delete" />
      </div>
    </Center>
  ),
  "/components/input": InputPreviewCard,
  "/components/input-otp": InputOtpPreviewCard,
  "/components/link-button": () => (
    <Center>
      <div className="flex flex-col items-center gap-3">
        <LinkButton>View documentation</LinkButton>
        <LinkButton trailingIcon={RiArrowRightSLine}>Browse components</LinkButton>
      </div>
    </Center>
  ),
  "/components/pagination": () => (
    <Center>
      {/* Full width: the nav spreads Previous / pages / Next across it, and at
          this width its own compact mode kicks in, so nothing clips. */}
      <div className="w-full">
        <Pagination page={3} totalPages={10} onChange={() => {}} />
      </div>
    </Center>
  ),
  "/components/radio": RadioPreview,
  "/components/segmented-control": () => (
    <Center>
      <SegmentedControl defaultSelectedKeys={["weekly"]} aria-label="Period">
        <SegmentedControlItem id="weekly">Weekly</SegmentedControlItem>
        <SegmentedControlItem id="monthly">Monthly</SegmentedControlItem>
        <SegmentedControlItem id="yearly">Yearly</SegmentedControlItem>
      </SegmentedControl>
    </Center>
  ),
  "/components/select": SelectPreviewCard,
  "/components/slider": SliderPreview,
  "/components/social-button": () => (
    <Center>
      <div className="flex w-full max-w-[230px] flex-col gap-2">
        <SocialButton brand="google" size="small" appearance="white" fullWidth />
        <SocialButton brand="apple" size="small" appearance="white" fullWidth />
        <SocialButton brand="github" size="small" appearance="white" fullWidth />
      </div>
    </Center>
  ),
  "/components/switch": SwitchPreview,
  "/components/tooltip": TooltipPreviewCard,
};
