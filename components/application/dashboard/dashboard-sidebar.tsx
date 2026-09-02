"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  RiAsterisk,
  RiBankLine,
  RiCalendarLine,
  RiChatAiLine,
  RiCloseLine,
  RiCustomerServiceLine,
  RiHomeLine,
  RiImageAiLine,
  RiMegaphoneLine,
  RiSearchLine,
  RiSettings4Line,
  RiSideBarFill,
  RiUserSmileLine,
} from "@remixicon/react";
import { SettingsModal } from "@/components/application/settings/settings-modal";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { Badge } from "@/components/base/badges/badge";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Kbd } from "@/components/base/kbd/kbd";
import { cx } from "@/utils/cx";
import { DashboardTeamMenu } from "./dashboard-team-menu";
import { DashboardUserMenu } from "./dashboard-user-menu";

/**
 * Figma sources:
 *   expanded  → Board UI → dashboard 1 → Sidebar (node 3731:2934)
 *   collapsed → Board UI → Sidebar (node 3768:3382)
 *
 * Floating sidebar panel. Expanded: 260px wide, p 12, radius/3xl (24px),
 * white 1px border, "Background/Sidebar Elevation" shadow, bg
 * background/secondary. Collapsed: 60px wide (36px icon items + 12px
 * padding); collapse button sits centered above the workspace avatar, quick
 * search becomes a 36px neutral-200 square, nav items become icon-only
 * squares, the team card reduces to its avatar.
 *
 * The two states morph into each other: the panel width animates while
 * labels / badges / kbd collapse via max-width + opacity.
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

/**
 * Collapsible text/badge slot: blurs + fades + shrinks away when the rail
 * closes, and blurs back in on expand. The icons/rows themselves stay pinned in
 * place — only these label/badge slots animate — so nothing jumps to center.
 */
function Collapsible({ collapsed, children, className }: { collapsed: boolean; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-40 opacity-100 blur-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  isSelected = false,
  collapsed = false,
  href = "#",
  onClick,
}: {
  icon: IconComponent;
  label: string;
  badge?: ReactNode;
  isSelected?: boolean;
  collapsed?: boolean;
  href?: string;
  /** Action rows (e.g. Settings → modal) intercept the navigation. */
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={
        onClick
          ? (event) => {
              event.preventDefault();
              onClick();
            }
          : undefined
      }
      aria-current={isSelected ? "page" : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "flex items-center justify-between overflow-hidden rounded-2lg p-2",
        "transition-[width,background-color] duration-300 ease-in-out",
        collapsed ? "w-9" : "w-full",
        isSelected
          ? "bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected"
          : "hover:bg-background-secondary-hover",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          className={cx("size-5 shrink-0", isSelected ? "text-white" : "text-foreground-icon-secondary")}
          aria-hidden
        />
        <Collapsible collapsed={collapsed}>
          <span
            className={cx(
              "text-body-medium whitespace-nowrap",
              isSelected ? "text-white" : "text-text-secondary",
            )}
          >
            {label}
          </span>
        </Collapsible>
      </span>
      {badge && <Collapsible collapsed={collapsed}>{badge}</Collapsible>}
    </a>
  );
}

/** A primary navigation row. Rows without an `href` are decoration only. */
export interface DashboardNavItem {
  key: string;
  label: string;
  icon: IconComponent;
  href?: string;
  badge?: string | number;
}

/** Kept as a name for callers that typed their `selected` prop; any key works. */
export type DashboardNavKey = string;

/** The Pro dashboard's navigation, the default set. */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { key: "home", label: "Home", icon: RiHomeLine, href: "/templates/dashboard", badge: 152 },
  { key: "marketing", label: "Marketing", icon: RiMegaphoneLine, href: "/templates/marketing" },
  { key: "calendar", label: "Calendar", icon: RiCalendarLine, href: "/templates/calendar" },
  { key: "finance", label: "Finance", icon: RiBankLine, href: "/templates/finance" },
  { key: "medical", label: "Medical Report", icon: RiAsterisk, href: "/templates/medical-profile" },
  { key: "ai-chat", label: "AI Chat", icon: RiChatAiLine, href: "/templates/ai-chat" },
  { key: "ai-image", label: "AI Image Generation", icon: RiImageAiLine, href: "/templates/ai-image-generation" },
  { key: "profile", label: "Profile", icon: RiUserSmileLine, href: "/templates/ai-profile" },
];

/**
 * The primary rows. A component of its own so the closures over `collapsed`
 * and the search query live here: built inline in the sidebar, the compiler
 * could not tell they leave `mobile` untouched and dropped the sidebar's
 * manual memoization.
 */
function NavRows({
  items,
  query,
  selected,
  collapsed,
  secondaryMatch,
}: {
  items: DashboardNavItem[];
  query: string;
  selected: string;
  collapsed: boolean;
  /** Whether Support or Settings matches, so "No results" only shows when nothing does. */
  secondaryMatch: boolean;
}) {
  const shown = items.filter((item) => item.label.toLocaleLowerCase().includes(query));
  if (shown.length === 0 && !secondaryMatch && !collapsed) {
    return <p className="px-2 py-3 text-body-regular text-text-tertiary">No results</p>;
  }
  return shown.map((item) => {
      const isSelected = selected === item.key;
      return (
        <NavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isSelected={isSelected}
          collapsed={collapsed}
          badge={
            item.badge !== undefined ? (
              <Badge color={isSelected ? "primary" : "neutral"}>{item.badge}</Badge>
            ) : undefined
          }
        />
      );
    });
}

export function DashboardSidebar({
  mobile = false,
  onClose,
  fluid = false,
  showThemeToggle = true,
  selected = "home",
  items = DASHBOARD_NAV,
  flat = false,
  className,
}: {
  /** Rendered inside the mobile drawer: always expanded, close button instead of collapse. */
  mobile?: boolean;
  onClose?: () => void;
  /** Expanded width fills its container below `lg` instead of the fixed
   *  260px (e.g. the landing page, where the sidebar isn't in a drawer).
   *  Collapsed width stays the fixed 60px rail at every breakpoint — the
   *  whole point of collapsing is to shrink, so it must never get
   *  overridden back to full width. */
  fluid?: boolean;
  /** Hide the app-level theme control when the sidebar is used as marketing artwork. */
  showThemeToggle?: boolean;
  /** Which nav item shows the selected (filled blue) state. */
  selected?: DashboardNavKey;
  /** Primary navigation rows. The Pro dashboard's set unless a screen brings its own. */
  items?: DashboardNavItem[];
  /** Removes the floating panel treatment for a sidebar revealed beneath mobile content. */
  flat?: boolean;
  className?: string;
} = {}) {
  const [collapsedState, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suppressUserHover, setSuppressUserHover] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchFieldRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const collapsed = mobile ? false : collapsedState;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (label: string) => label.toLocaleLowerCase().includes(normalizedQuery);
  const secondaryLabels = ["Support", "Settings"];
  const secondaryMatch = secondaryLabels.some(matches);

  const activateSearch = useCallback(() => {
    if (!mobile) setCollapsed(false);
    setSearchActive(true);
  }, [mobile]);

  const deactivateSearch = useCallback((restoreFocus: boolean) => {
    setQuery("");
    setSearchActive(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!searchActive) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [searchActive]);

  useEffect(() => {
    if (!searchActive) return;

    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && searchFieldRef.current?.contains(target)) return;
      deactivateSearch(false);
    };

    document.addEventListener("click", onOutsideClick);
    return () => document.removeEventListener("click", onOutsideClick);
  }, [deactivateSearch, searchActive]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() === "l" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        activateSearch();
      }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activateSearch]);

  return (
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden",
        flat
          ? "bg-background-full"
          : "rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar",
        "transition-[width] duration-300 ease-in-out",
        // Collapsed rail keeps the 60px spec: 1px border + 11px padding on each
        // side leaves an exactly 36px column so the w-9 (36px) icon items center.
        collapsed
          ? "w-[60px] px-[11px] py-3"
          : fluid
            ? "w-full p-3 lg:w-[260px]"
            : "w-[260px] p-3",
        className,
      )}
    >
      {/* `overflow-y: auto` forces the x axis to clip too, and this box hugs
          its contents on every side — so the selected item's 1px ring, the
          profile's hover pill (which outsets 6px) and focus rings all landed
          outside it. Padding moves the clip edge out; the matching negative
          margin borrows that space back from the rail's own padding, leaving
          every child exactly where it was. */}
      <div
        className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]"
      >
        {/* Workspace switcher / collapse control */}
        <div
          className={cx(
            "flex w-full transition-[gap] duration-300 ease-in-out",
            collapsed
              ? "flex-col-reverse items-start justify-center gap-2.5"
              : "flex-row items-center justify-between",
          )}
        >
          {/* The clip is here to hide the label as `max-width` animates shut,
              but it also cropped the trigger's hover pill down to four corner
              arcs. Same trick as the scroller: pad the clip box out by the
              pill's 8px reach and pull it back with a negative margin, so the
              widths below are 16px larger than the footprint they produce. */}
          <div
            className={cx(
              "-m-2 min-w-0 overflow-hidden p-2 transition-[max-width,opacity,transform] duration-300 ease-in-out",
              mobile && flat && searchActive
                ? "max-w-0 scale-95 opacity-0"
                : "max-w-[206px] scale-100 opacity-100",
            )}
          >
            <DashboardUserMenu
              collapsed={collapsed}
              suppressHover={suppressUserHover}
              onHoverSuppressionEnd={() => setSuppressUserHover(false)}
              avatarClassName={
                flat
                  ? "bg-background-tertiary-default dark:bg-background-secondary-default"
                  : undefined
              }
            />
          </div>
          {mobile && flat ? (
            <div
              ref={searchFieldRef}
              className={cx(
                "flex h-9 items-center overflow-hidden rounded-full bg-background-tertiary-default transition-[width,box-shadow] duration-300 ease-in-out",
                searchActive
                  ? "w-full gap-2 pr-2.5 pl-2 ring-2 ring-inset ring-border-button-active"
                  : "w-9 gap-0 px-2",
              )}
            >
              <button
                ref={searchTriggerRef}
                type="button"
                aria-label="Search"
                onClick={activateSearch}
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center text-foreground-icon-secondary"
              >
                <RiSearchLine className="size-5" aria-hidden />
              </button>
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Filter template navigation"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    deactivateSearch(true);
                  }
                }}
                placeholder="Search..."
                tabIndex={searchActive ? 0 : -1}
                className={cx(
                  "min-w-0 bg-transparent text-body-medium tracking-[-0.015em] text-text-primary outline-none placeholder:text-text-tertiary",
                  "transition-[width,opacity] duration-200 ease-in-out",
                  searchActive
                    ? "w-full flex-1 opacity-100 delay-100"
                    : "pointer-events-none w-0 flex-none opacity-0 delay-0",
                )}
              />
              <CloseButton
                size="2xs"
                aria-label="Clear navigation search"
                onClick={() => deactivateSearch(true)}
                className={cx(
                  "shrink-0 bg-background-tertiary-hover transition-opacity duration-150",
                  searchActive ? "opacity-100 delay-150" : "pointer-events-none opacity-0 delay-0",
                )}
              />
            </div>
          ) : mobile ? (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="cursor-pointer text-foreground-icon-secondary"
            >
              <RiCloseLine className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              onClick={() => {
                const isExpanding = collapsedState;
                if (!isExpanding) deactivateSearch(false);
                setCollapsed(!collapsedState);
                setSuppressUserHover(isExpanding);
              }}
              className={cx(
                "cursor-pointer text-foreground-icon-secondary transition-transform duration-300 ease-in-out",
                collapsed && "flex w-9 items-center justify-center",
              )}
            >
              <RiSideBarFill
                className={cx("size-5 transition-transform duration-300 ease-in-out", !collapsed && "-scale-x-100")}
                aria-hidden
              />
            </button>
          )}
        </div>

        <div className="flex w-full flex-col gap-3">
          {/* Quick search */}
          {!flat && (searchActive && !collapsed ? (
            <div
              ref={searchFieldRef}
              className="flex w-full items-center gap-2 rounded-full bg-background-tertiary-default py-2 pr-2.5 pl-2 ring-2 ring-inset ring-border-button-active transition-[background-color,box-shadow] duration-[var(--input-transition-ms)] ease"
            >
              <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Filter template navigation"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    deactivateSearch(true);
                  }
                }}
                placeholder="Search navigation…"
                className="min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <CloseButton
                size="2xs"
                aria-label="Clear navigation search"
                onClick={() => deactivateSearch(true)}
                className="bg-background-tertiary-hover"
              />
            </div>
          ) : (
            <button
              ref={searchTriggerRef}
              type="button"
              aria-label="Quick Search"
              title={collapsed ? "Quick Search" : undefined}
              onClick={activateSearch}
              className={cx(
                "flex cursor-pointer items-center gap-2 p-2 hover:bg-background-tertiary-hover/55",
                "transition-[width,border-radius,background-color] duration-300 ease-in-out",
                collapsed
                  ? "w-9 rounded-full bg-background-tertiary-default"
                  : "w-full rounded-full bg-background-tertiary-default",
              )}
            >
              <span className={cx("flex min-w-0 items-center gap-2", !collapsed && "flex-1")}>
                <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                <Collapsible collapsed={collapsed}>
                  <span className="text-body-medium whitespace-nowrap text-text-secondary">
                    Quick Search
                  </span>
                </Collapsible>
              </span>
              <Collapsible collapsed={collapsed}>
                <Kbd>⌘L</Kbd>
              </Collapsible>
            </button>
          ))}

          {/* Primary nav. The 2px inset is for the expanded rail only: the
              collapsed column is exactly as wide as a 36px item, so padding
              here pushes every item 2px right and the rail's own clip shaves
              that much off its selected fill and hover state. */}
          <nav className={cx("flex w-full flex-col gap-1", !collapsed && "px-0.5")}>
            <NavRows
              items={items}
              query={normalizedQuery}
              selected={selected}
              collapsed={collapsed}
              secondaryMatch={secondaryMatch}
            />
          </nav>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        {showThemeToggle &&
          (collapsed ? (
            <ThemeToggle collapsed />
          ) : (
            <ThemeToggle
              appearance="sidebar-segmented"
              className={flat ? "!bg-background-secondary-default" : undefined}
            />
          ))}
        {/* Secondary nav */}
        <nav className="flex w-full flex-col gap-1">
          {matches("Support") && (
            <NavItem icon={RiCustomerServiceLine} label="Support" collapsed={collapsed} />
          )}
          {matches("Settings") && (
            <NavItem
              icon={RiSettings4Line}
              label="Settings"
              collapsed={collapsed}
              onClick={() => setSettingsOpen(true)}
            />
          )}
        </nav>

        {/* Team card → opens the profile menu next to the sidebar */}
        <DashboardTeamMenu
          collapsed={collapsed}
          className={flat ? "!bg-background-secondary-default" : undefined}
        />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        planArtSrc="/templates/settings-plan-art.png"
      />
    </aside>
  );
}
