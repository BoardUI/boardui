"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  RiBankCardLine,
  RiBookOpenLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiCodeBlock,
  RiDatabase2Line,
  RiGitMergeLine,
  RiOrganizationChart,
  RiPaletteLine,
  RiPlugLine,
  RiSchoolLine,
  RiSettings6Line,
  RiSettingsLine,
  RiToolsFill,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { SettingsGeneral } from "./settings-general";
import { SettingsProfile } from "./settings-profile";
import { SettingsStorage } from "./settings-storage";
import { SettingsTools } from "./settings-tools";

/**
 * Figma sources: Board UI → "Settings/Profile" (node 4081:13943) and
 * "Settings/General" (node 4079:13037).
 *
 * The app-wide settings modal, opened from any sidebar's "Settings" item.
 *
 * Shell (1:1 with Figma):
 *   backdrop  color/bg_separator — black at 20%.
 *   panel     871×614 (max-height 614), radius/3xl (24px), white, shadow/xs.
 *   rail      274px, bg background/secondary, 1px right border, p 10 —
 *             same group/item recipe as the board-team dropdown menus
 *             (label pl-8, items p-8 radius/2lg icon-20 + body-medium),
 *             selected row bg background/secondary/hover.
 *   content   px 32 (274 + 32 = Figma's 306 title inset), title row fixed,
 *             the page itself scrolls when taller than the shell (General).
 *
 * Open/close animation: the panel fades + blurs in from scale 0.85 (300ms),
 * the backdrop cross-fades; the same transition plays in reverse on close,
 * and the modal unmounts only after the exit transition finishes.
 */

export type SettingsPage = "general" | "profile" | "storage" | "tools";

export interface SettingsModalProps {
  /** Controlled open state, owned by the host page, sidebar, or menu. */
  isOpen: boolean;
  /** Called by the backdrop, close button, and Escape key. */
  onClose: () => void;
  /** Page selected each time the modal opens. */
  defaultPage?: SettingsPage;
  /** Optional product artwork used by the animated Current plan card. */
  planArtSrc?: string;
}

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface NavEntry {
  label: string;
  icon: IconComponent;
  /** Only pages that exist are navigable; the rest render as static rows. */
  page?: SettingsPage;
}

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Settings",
    items: [
      { label: "General", icon: RiSettings6Line, page: "general" },
      { label: "Profile", icon: RiSchoolLine, page: "profile" },
      { label: "Appearance", icon: RiPaletteLine },
      { label: "Billing", icon: RiBankCardLine },
      { label: "Rules and Workflows", icon: RiOrganizationChart },
      { label: "Tools", icon: RiToolsFill, page: "tools" },
      { label: "Storage", icon: RiDatabase2Line, page: "storage" },
    ],
  },
  {
    label: "Desktop app",
    items: [
      { label: "General", icon: RiSettingsLine },
      { label: "Plugins", icon: RiPlugLine },
      { label: "Developer", icon: RiCodeBlock },
    ],
  },
  {
    label: "Customize",
    items: [
      { label: "Skills", icon: RiBookOpenLine },
      { label: "Git", icon: RiGitMergeLine },
    ],
  },
];

const PAGE_TITLES: Record<SettingsPage, string> = {
  general: "General",
  profile: "Profile",
  storage: "Storage",
  tools: "Tools",
};

export function SettingsModal({
  isOpen,
  onClose,
  defaultPage = "general",
  planArtSrc,
}: SettingsModalProps) {
  const [page, setPage] = useState<SettingsPage>(defaultPage);

  // Mount/visible two-phase state so both the enter and the exit play the
  // full fade + blur + scale transition before the DOM goes away.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // "Saved" toast — floats half-out of the panel's bottom edge for ~2s
  // whenever a profile field commits a change (Enter / blur). Three phases
  // so the motion is directional: it rises in from below ("hidden" starting
  // offset) and keeps drifting upward while fading out ("leaving" offset).
  const [savedPhase, setSavedPhase] = useState<"hidden" | "shown" | "leaving">("hidden");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSavedToast = () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedPhase("shown");
    savedTimer.current = setTimeout(() => {
      setSavedPhase("leaving");
      // Reset to the below-the-edge start once the fade-out finished, so the
      // next save rises in from the bottom again (invisible: opacity 0 → 0).
      savedTimer.current = setTimeout(() => setSavedPhase("hidden"), 220);
    }, 2000);
  };

  // Top fade over the scrolling page so rows dissolve under the title row
  // instead of cutting sharply (same recipe as the medical alerts feed).
  const [contentScrolled, setContentScrolled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setPage(defaultPage);
      setMounted(true);
      // Double rAF: the panel must commit its hidden state before the
      // transition to visible starts, or the browser skips the animation.
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      setSavedPhase("hidden");
      unmountTimer.current = setTimeout(() => setMounted(false), 320);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultPage only matters at the open transition
  }, [isOpen]);

  // Escape closes; focus moves into the dialog on open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop — dark-mode modal reference uses black at 70%. */}
      <button
        type="button"
        aria-label="Close settings"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          "absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Animated wrapper — carries the open/close transition for the panel
          AND the saved toast, which straddles the panel's bottom edge and so
          must live outside the panel's overflow-clip. */}
      <div
        className={cx(
          "relative",
          // Kept light on purpose: an 8px blur over the full 871×614 panel
          // forces a huge re-filter every frame of the scale-down, which is
          // what made the close stutter. 4px + GPU promotion stays smooth.
          "transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[opacity,transform,filter]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.85] opacity-0 blur-[4px]",
        )}
      >
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className={cx(
          "relative flex h-[614px] max-h-[calc(100dvh-32px)] w-[871px] max-w-[calc(100vw-32px)]",
          // overflow-CLIP, not hidden: hidden boxes are still programmatically
          // scrollable, so focusing a switch's hidden input in a row clipped
          // by the inner scroller made the browser scroll-reveal it through
          // the panel too — shifting the whole modal content up with no way
          // back. clip forbids scrolling outright.
          "overflow-clip rounded-3xl bg-background-full shadow-xs outline-none",
        )}
      >
        {/* Nav rail — the board-team dropdown group/item recipe */}
        <nav
          aria-label="Settings sections"
          className="flex w-[274px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-separator-border bg-background-secondary-default p-2.5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex w-full flex-col gap-1.5 pt-1">
              <span className="pl-2 text-body-medium text-text-secondary">{group.label}</span>
              <div className="flex w-full flex-col gap-1">
                {group.items.map((item) => {
                  const selected = item.page !== undefined && item.page === page;
                  return (
                    <button
                      key={`${group.label}:${item.label}`}
                      type="button"
                      aria-current={selected ? "page" : undefined}
                      onClick={
                        item.page
                          ? () => {
                              setPage(item.page!);
                              setContentScrolled(false);
                            }
                          : undefined
                      }
                      className={cx(
                        "flex w-full cursor-pointer items-center gap-2 rounded-2lg p-2 text-left",
                        "outline-none transition-colors duration-150 ease focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                        selected
                          ? "bg-background-secondary-hover"
                          : "hover:bg-background-secondary-hover/60",
                      )}
                    >
                      <item.icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                      <span
                        className={cx(
                          "truncate text-body-medium",
                          selected ? "text-text-primary" : "text-text-secondary",
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Content pane — fixed title row, scrollable page below */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Storage keeps a tighter title gap: its page already carries
              10px of scroll-safe headroom for the upload progress badge, so
              the shared pb-3 read as a double margin above the dropzone. */}
          <div
            className={cx(
              "flex shrink-0 items-center justify-between px-8 pt-8",
              page === "storage" ? "pb-1.5" : "pb-3",
            )}
          >
            <h2 className="text-title-3-medium text-text-primary">{PAGE_TITLES[page]}</h2>
            <button
              type="button"
              aria-label="Close settings"
              onClick={onClose}
              className={cx(
                "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full",
                "bg-background-tertiary-default text-foreground-icon-secondary",
                "transition-colors duration-150 ease hover:bg-background-tertiary-hover",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              <RiCloseLine className="size-4" aria-hidden />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              className="h-full overflow-y-auto px-8 pb-8"
              onScroll={(e) => setContentScrolled(e.currentTarget.scrollTop > 0)}
            >
              {page === "profile" ? (
                <SettingsProfile onSaved={showSavedToast} />
              ) : page === "storage" ? (
                <SettingsStorage />
              ) : page === "tools" ? (
                <SettingsTools />
              ) : (
                <SettingsGeneral planArtSrc={planArtSrc} />
              )}
            </div>
            {/* Progressive top fade — eases in once the page is scrolled so
                content dissolves under the title row instead of hard-cutting. */}
            <div
              aria-hidden
              className={cx(
                "pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-background-primary-default to-transparent",
                "transition-opacity duration-200 ease-out",
                contentScrolled ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      {/* Saved toast — straddles the panel's bottom edge, half in / half out. */}
      <div
        aria-live="polite"
        className={cx(
          "pointer-events-none absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1",
          "rounded-full border border-border-button-default bg-background-primary-default py-1 pr-2.5 pl-1.5 shadow-dropdown",
          "transition-[opacity,transform,filter] duration-200 ease-out",
          savedPhase === "shown" && "translate-y-1/2 opacity-100 scale-100 blur-0",
          // Starts below the resting spot, rises in; keeps drifting up on exit.
          savedPhase === "hidden" && "translate-y-[calc(50%+12px)] opacity-0 scale-90 blur-[2px]",
          savedPhase === "leaving" && "translate-y-[calc(50%-10px)] opacity-0 scale-90 blur-[2px]",
        )}
      >
        <RiCheckboxCircleFill className="size-4 shrink-0 text-lime-600" aria-hidden />
        <span className="text-body-2-medium whitespace-nowrap text-text-primary">Saved</span>
      </div>
      </div>
    </div>,
    document.body,
  );
}
