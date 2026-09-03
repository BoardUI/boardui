"use client";

/**
 * Landing/index previews of free components, kept apart from the landing
 * section (which also previews Pro) so the starter can render them live.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import Image from "next/image";
import { RangeCalendar } from "react-aria-components";
import { RiFlagLine, RiGlobalLine } from "@remixicon/react";
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking";
import { AccountMenuContent } from "@/components/application/dashboard/dashboard-user-menu";
import { DashboardSidebar } from "@/components/application/dashboard/dashboard-sidebar";
import { DataTableExample } from "@/components/application/data-table/data-table";
import { Button } from "@/components/base/buttons/button";
import { MonthPanel } from "@/components/base/date-picker/shared";
import { FileUpload } from "@/components/base/file-upload/file-upload";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";

export function DataTablePreview() {
  return (
    <div className="absolute top-[15px] right-4 left-4 h-[212px] overflow-hidden rounded-[6px] xl:right-auto xl:left-[15px] xl:h-[179px] xl:w-[275px]">
      {/* On desktop the table is painted at its real 790px width and cropped
          by the card, the same way the sidebar preview is, so the rows read at
          their true size instead of being shrunk to a third. Narrower screens
          keep scaling to fit, where a crop would leave too little of it. */}
      <div className="w-[790px] origin-top-left scale-[calc((100cqw-32px)/790)] xl:scale-100">
        <DataTableExample showSizeToggle={false} pageSize={5} />
      </div>
    </div>
  );
}

export function SidebarPreview() {
  return (
    <div className="absolute top-[19px] left-1/2 h-[732px] w-[260px] -translate-x-1/2 transition-transform duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:250ms] sm:group-hover/card:-translate-y-[554px] sm:group-hover/card:[transition-delay:0ms]">
      <DashboardSidebar fluid showThemeToggle={false} />
    </div>
  );
}

export function DropdownPreview() {
  return (
    <div className="absolute top-5 left-1/2 flex min-h-[235px] w-[266px] -translate-x-1/2 flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown transition-transform duration-[700ms] ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:250ms] sm:group-hover/card:-translate-y-[58px] sm:group-hover/card:[transition-delay:0ms]">
      <AccountMenuContent onSelect={() => {}} />
    </div>
  );
}

/**
 * The four thinking indicators, stacked.
 *
 * All four rather than one: the variants are the component, and a single dot
 * grid at rest would not say that. Timers off — four independent clocks
 * ticking in one card is noise, and the detail page is where they matter.
 */
export function AgentThinkingPreview() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-5">
      {/* Left-aligned inside a centred column, so the indicators line up with
          each other rather than each row centring on its own label length. */}
      <div className="flex flex-col items-start gap-3.5">
        <AgentThinking variant="wave" label="Thinking" showTimer={false} />
        <AgentThinking variant="spin" label="Searching the docs" showTimer={false} />
        <AgentThinking variant="stars" label="Reading files" showTimer={false} />
        <AgentThinking variant="infinity" label="Writing the answer" showTimer={false} />
      </div>
    </div>
  );
}

function DocumentPluginIcon({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex shrink-0", className)}>
      <Image
        src="/ai-chat/plugin-documents.svg"
        alt=""
        width={48}
        height={48}
        unoptimized
        className="theme-asset-light size-full object-contain"
        aria-hidden
      />
      <Image
        src="/ai-chat/plugin-documents-dark.svg"
        alt=""
        width={48}
        height={48}
        unoptimized
        className="theme-asset-dark size-full object-contain"
        aria-hidden
      />
    </span>
  );
}

export function FileUploadPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropTimerRef = useRef<number | null>(null);
  const busyUntilRef = useRef(0);
  const [showDropFile, setShowDropFile] = useState(false);

  const startDropDemo = useCallback(() => {
    if (dropTimerRef.current !== null || Date.now() < busyUntilRef.current) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;

    setShowDropFile(true);
    dropTimerRef.current = window.setTimeout(() => {
      const input = containerRef.current?.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([new Uint8Array(1_800_000)], "boardui-components.pdf", { type: "application/pdf" }),
        );
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        busyUntilRef.current = Date.now() + 5000;
      }
      dropTimerRef.current = window.setTimeout(() => {
        dropTimerRef.current = null;
        setShowDropFile(false);
      }, 300);
    }, 1250);
  }, []);

  const cancelPendingDrop = useCallback(() => {
    if (dropTimerRef.current !== null) {
      window.clearTimeout(dropTimerRef.current);
      dropTimerRef.current = null;
    }
    setShowDropFile(false);
  }, []);

  useEffect(() => {
    const card = containerRef.current?.closest("article");
    card?.addEventListener("mouseenter", startDropDemo);
    card?.addEventListener("mouseleave", cancelPendingDrop);

    return () => {
      card?.removeEventListener("mouseenter", startDropDemo);
      card?.removeEventListener("mouseleave", cancelPendingDrop);
      if (dropTimerRef.current !== null) window.clearTimeout(dropTimerRef.current);
    };
  }, [cancelPendingDrop, startDropDemo]);

  return (
    <div
      ref={containerRef}
      className="absolute top-8 left-1/2 w-[265px] -translate-x-1/2 sm:top-6"
    >
      <FileUpload
        renderFileIcon={() => <DocumentPluginIcon className="size-6" />}
      />
      {showDropFile ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
        >
          <DocumentPluginIcon className="animate-landing-file-drop size-12" />
        </span>
      ) : null}
    </div>
  );
}

export function MeetingSchedulePreview() {
  const [date, setDate] = useState<CalendarDate>(parseDate("2026-08-10"));

  return (
    <div className="absolute top-[19px] left-4 flex h-[430px] w-[700px] origin-top-left scale-[calc((100cqw-32px)/1000)] gap-4 rounded-3xl bg-background-secondary-default p-3 sm:scale-[calc((100cqw-32px)/700)] xl:left-5 xl:scale-[0.47]">
      <div className="flex w-[220px] shrink-0 flex-col gap-4 rounded-2xl bg-background-primary-default p-4 shadow-xs">
        <Avatar size="sm" color="blue" initials="M" />
        <div>
          <p className="text-body-medium text-text-primary">Mertcan Esmergul</p>
          <p className="text-body-2-regular text-text-secondary">hi@mertcan.works</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-headline-medium text-text-primary">30 min intro meeting</p>
          <p className="text-body-2-regular text-text-secondary">
            Let&apos;s discuss your design needs and how we can collaborate 🥳
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-2 text-body-2-medium text-text-secondary">
          <span className="flex items-center gap-1.5"><RiGlobalLine className="size-4" />30 minutes</span>
          <span className="flex items-center gap-1.5"><RiFlagLine className="size-4" />English</span>
        </div>
      </div>
      <RangeCalendar aria-label="Meeting date" value={{ start: date, end: date }} onChange={(range) => setDate(range.start)}>
        <MonthPanel offset={0} showNext />
      </RangeCalendar>
      <div className="flex w-[170px] flex-col gap-2 rounded-2xl bg-background-primary-default p-3">
        {["14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"].map((time) => (
          <Button key={time} variant="secondary" size="small">{time}</Button>
        ))}
      </div>
    </div>
  );
}
