"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { RiAddFill, RiEqualizer3Line } from "@remixicon/react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { ChevronUpDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

/**
 * Figma source: Board UI → sidebar account menu (node 3828:3895).
 *
 * Dropdown opened from the sidebar's workspace switcher (avatar + name +
 * chevron) at the top. Floats to the right of the sidebar with the same panel
 * surface and appear animation as the team menu: white, 1px border, radius 16,
 * p 10, shadow/dropdown. Lists the users with access (20px tinted-initial
 * avatars + name), a full-bleed divider, then "Add user" / "Manage" actions.
 */

type AvatarColor = "neutral" | "lime" | "pink";

type UserRow = {
  initials: string;
  color: AvatarColor;
  name: string;
  isSelected?: boolean;
};

const USERS: UserRow[] = [
  { initials: "M", color: "neutral", name: "Mertcan Esmergul" },
  { initials: "S", color: "lime", name: "Steven Raule" },
  { initials: "L", color: "pink", name: "Lauren Proso" },
];

/** Label slot on the trigger: blurs + fades away as the rail collapses. */
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

function UserMenuItem({ initials, color, name, isSelected, onSelect }: UserRow & { onSelect: () => void }) {
  return (
    <a
      href="#"
      aria-current={isSelected ? "page" : undefined}
      onClick={onSelect}
      className={cx(
        "flex w-full items-center gap-2 rounded-2lg px-2 py-1.5 outline-none transition-colors",
        isSelected
          ? "bg-background-primary-hover"
          : "hover:bg-background-primary-hover focus-visible:bg-background-primary-hover",
      )}
    >
      <Avatar size="xs" color={color} initials={initials} />
      <span className="truncate text-body-medium text-text-primary">{name}</span>
    </a>
  );
}

/** The dropdown's contents — users-with-access list + Add user/Manage
 *  actions — split out so other triggers (e.g. the calendar template's
 *  inbox icon) can open the same panel without duplicating it. */
export function AccountMenuContent({ onSelect }: { onSelect: () => void }) {
  return (
    <>
      {/* Users with access */}
      <div className="flex w-full flex-col gap-1.5 pt-[5px]">
        <span className="px-2 text-body-medium text-text-secondary">Users with access</span>
        <div className="flex w-full flex-col gap-1">
          {USERS.map((user) => (
            <UserMenuItem key={user.name} {...user} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {/* Divider centered in the 28px gap between the list and the actions */}
      <div className="-mx-2.5 my-3.5 h-px bg-border-button-default" />

      {/* Actions — pb-2 makes the space below the buttons match their
          left/right inset (panel p-2.5 + row px-2 = 18px on every side). */}
      <div className="flex w-full items-center gap-3 px-2 pb-2">
        <Button variant="secondary" size="small" leadingIcon={RiAddFill} className="flex-1" onClick={onSelect}>
          Add user
        </Button>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiEqualizer3Line}
          className="flex-1"
          onClick={onSelect}
        >
          Manage
        </Button>
      </div>
    </>
  );
}

export function DashboardUserMenu({
  collapsed = false,
  suppressHover = false,
  onHoverSuppressionEnd,
  avatarClassName,
}: {
  collapsed?: boolean;
  /** Prevents expansion from creating a hover state under a stationary pointer. */
  suppressHover?: boolean;
  /** Re-arms hover after the pointer fully leaves the trigger. */
  onHoverSuppressionEnd?: () => void;
  avatarClassName?: string;
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
        aria-label="Mertcan Esmergul"
        onPointerLeave={() => {
          if (suppressHover) onHoverSuppressionEnd?.();
        }}
        className={cx(
          "relative flex min-w-0 cursor-pointer items-center gap-2 rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          // Hover pill (Figma node 3829:4063): a fully-rounded 2px border/button/hover
          // outline drawn via a pseudo-element so it never shifts the layout.
          "before:pointer-events-none before:absolute before:-inset-x-1.5 before:-inset-y-[5px] before:rounded-full before:border-2 before:border-transparent before:transition-colors before:duration-150",
          !suppressHover && "hover:before:border-border-sidebar-profile-hover",
          // Collapsed, the trigger takes the rail's own 36px column and centres
          // the 32px avatar in it, instead of sizing to the avatar plus a gap
          // held open for a label that's shrunk to nothing. That gap made the
          // button 42px wide in a 36px rail, which pushed its hover pill
          // off-centre and into the rail's clip.
          //
          // The pill's insets go square too: 36×32 plus the expanded 6/5 reach
          // is a 48×42 stadium, not the circle the avatar wants. 3/5 lands it
          // on 42×42.
          collapsed && "w-9 justify-center gap-0 before:-inset-x-[3px]",
        )}
      >
        <Avatar size="md" color="neutral" initials="M" className={avatarClassName} />
        <Collapsible collapsed={collapsed}>
          <span className="flex items-center gap-0.5">
            <span className="text-body-medium whitespace-nowrap text-text-primary">Mertcan Esmergul</span>
            <ChevronUpDownSmall className="size-4 shrink-0 text-foreground-icon-tertiary" />
          </span>
        </Collapsible>
      </AriaButton>

      <AriaPopover
        placement={isMobile ? "bottom start" : "right top"}
        offset={8}
        className={cx(
          "w-[265px] max-w-[calc(100vw-32px)] origin-top-left overflow-y-auto",
          "rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown",
          "transition duration-150 ease-out",
          "data-[entering]:opacity-0 data-[entering]:scale-95 data-[entering]:blur-[2px]",
          "data-[exiting]:opacity-0 data-[exiting]:scale-95 data-[exiting]:blur-[2px]",
        )}
      >
        <AriaDialog aria-label="Account menu" className="flex flex-col outline-none">
          <AccountMenuContent onSelect={() => setIsOpen(false)} />
        </AriaDialog>
      </AriaPopover>
    </AriaDialogTrigger>
  );
}
