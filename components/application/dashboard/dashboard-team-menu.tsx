"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  RiBankCardLine,
  RiBankLine,
  RiBox3Line,
  RiFolder6Line,
  RiGroupLine,
  RiLogoutBoxRLine,
  RiMessage2Line,
  RiNotification3Line,
  RiSchoolLine,
  RiShieldUserLine,
} from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badge";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

/**
 * Figma source: Board UI → sidebar profile menu (node 3823:3699).
 *
 * Dropdown opened from the sidebar's "Board team" card. Floats to the right of
 * the sidebar: white panel, 1px border/button/default, radius 16, p 10,
 * shadow/dropdown. Header (team avatar + name/email), three grouped sections of
 * sidebar-style rows separated by full-bleed dividers, and a "BoardUI" + version
 * footer. Rows mirror the sidebar nav item pattern (icon + label + optional
 * counter) but use the menu tokens from Figma (text/primary label,
 * background/primary/hover on hover + the selected row).
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type MenuRow = {
  icon: IconComponent;
  label: string;
  badge?: string;
  isSelected?: boolean;
};

type MenuGroup = {
  id: string;
  label?: string;
  items: MenuRow[];
};

const GROUPS: MenuGroup[] = [
  {
    id: "workspace",
    items: [
      { icon: RiBankLine, label: "View team profile" },
      { icon: RiFolder6Line, label: "Folders" },
      { icon: RiMessage2Line, label: "Messages", badge: "94" },
      { icon: RiGroupLine, label: "People" },
    ],
  },
  {
    id: "company",
    label: "Company",
    items: [
      { icon: RiBankCardLine, label: "Billing" },
      { icon: RiSchoolLine, label: "Company Details" },
      { icon: RiBox3Line, label: "Integrations" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    items: [
      { icon: RiNotification3Line, label: "Notifications" },
      { icon: RiShieldUserLine, label: "Account Details" },
      { icon: RiLogoutBoxRLine, label: "Sign out" },
    ],
  },
];

/** Label/chevron slot on the trigger: blurs + fades away as the rail collapses. */
function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  );
}

function TeamMenuItem({ icon: Icon, label, badge, isSelected, onSelect }: MenuRow & { onSelect: () => void }) {
  return (
    <a
      href="#"
      aria-current={isSelected ? "page" : undefined}
      onClick={onSelect}
      className={cx(
        "flex w-full items-center gap-2.5 rounded-2lg p-2 outline-none transition-colors",
        isSelected
          ? "bg-background-primary-hover"
          : "hover:bg-background-primary-hover focus-visible:bg-background-primary-hover",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
        <span className="truncate text-body-medium text-text-primary">{label}</span>
      </span>
      {badge && (
        <Badge
          color="neutral"
          className="bg-team-menu-count-background text-team-menu-count-foreground"
        >
          {badge}
        </Badge>
      )}
    </a>
  );
}

export function DashboardTeamMenu({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // "right" placement assumes room to the sidebar's right (true in-flow on
  // desktop) — on mobile the sidebar can span the full viewport, so the
  // 265px panel would render off-screen. Below sm, drop into a plain
  // dropdown under the trigger instead.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <AriaButton
        aria-label="Board team"
        className={cx(
          "flex cursor-pointer items-center overflow-hidden outline-none",
          "border-2 border-transparent hover:border-border-button-hover",
          "transition-[width,background-color,border-color,padding] duration-300 ease-in-out",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          collapsed
            ? "size-9 justify-start rounded-full bg-transparent p-0"
            : "w-full justify-between rounded-xl bg-background-tertiary-default py-2 pr-4 pl-2.5",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar size="md" color="blue" src="/brand/boardui_logo_circle.webp" alt="Board team" />
          <Collapsible collapsed={collapsed}>
            <span className="flex min-w-0 flex-col items-start justify-center">
              <span className="text-body-medium whitespace-nowrap text-text-primary">Board team</span>
              <span className="text-body-regular whitespace-nowrap text-text-secondary">hi@boardui.com</span>
            </span>
          </Collapsible>
        </span>
        <Collapsible collapsed={collapsed}>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-background-tertiary-hover">
            <ChevronDownSmall
              className={cx("size-4 text-text-secondary transition-transform duration-200 ease", isOpen && "rotate-180")}
            />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : "right bottom"}
        offset={8}
        className={cx(
          "w-[265px] max-w-[calc(100vw-32px)] origin-bottom-left overflow-y-auto",
          "rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
        )}
      >
        <AriaDialog aria-label="Board team menu" className="flex flex-col gap-[7px] outline-none">
          {/* Header */}
          <div className="flex w-full items-center gap-2 px-2 pt-1">
            <Avatar size="md" color="blue" src="/brand/boardui_logo_circle.webp" alt="Board team" />
            <div className="flex min-w-0 flex-col items-start justify-center">
              <span className="text-body-medium whitespace-nowrap text-text-primary">Board team</span>
              <span className="text-body-regular whitespace-nowrap text-text-secondary">hi@boardui.com</span>
            </div>
          </div>

          {/* Grouped sidebar-style rows */}
          <div className="flex w-full flex-col">
            {GROUPS.map((group, index) => (
              <Group key={group.id} group={group} showDivider={index > 0} onSelect={() => setIsOpen(false)} />
            ))}
          </div>

          {/* Footer */}
          <div className="flex w-full items-center justify-between px-2 pt-1 pb-2">
            <span className="text-body-2-medium whitespace-nowrap text-text-tertiary">BoardUI</span>
            <span className="inline-flex items-center justify-center rounded-sm bg-background-tertiary-default px-1 py-px text-body-2-medium whitespace-nowrap text-text-tertiary">
              v1.0.1
            </span>
          </div>
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  );
}

function Group({ group, showDivider, onSelect }: { group: MenuGroup; showDivider: boolean; onSelect: () => void }) {
  return (
    <>
      {showDivider && <div className="-mx-2.5 my-2.5 h-px bg-border-button-default" />}
      <div className={cx("flex w-full flex-col gap-1", group.label && "gap-1.5 pt-1")}>
        {group.label && (
          <span className="px-2 text-body-medium text-text-secondary">{group.label}</span>
        )}
        <div className="flex w-full flex-col gap-1">
          {group.items.map((item) => (
            <TeamMenuItem key={item.label} {...item} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </>
  );
}
