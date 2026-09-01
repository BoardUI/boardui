"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { Switch as AriaSwitch } from "react-aria-components";
import { SwitchTrack } from "@/components/base/switch/switch";
import { cx } from "@/utils/cx";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "boardui:theme";
export const THEME_CHANGE_EVENT = "boardui:theme-change";

const THEME_TRANSITION_DURATION = 820;
const THEME_TRANSITION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const THEME_TRANSITION_STYLE_ID = "boardui-theme-transition-style";

type ThemeTransitionOrigin = { x: number; y: number };

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

let themeTransitionRunning = false;

function createBlurCircleMask() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    '<defs><filter id="blur" x="-50%" y="-50%" width="200%" height="200%">',
    '<feGaussianBlur stdDeviation="2" /></filter></defs>',
    '<circle cx="50" cy="50" r="42" fill="white" filter="url(#blur)" />',
    "</svg>",
  ].join("");

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function installThemeTransitionStyle(
  { x, y }: ThemeTransitionOrigin,
  radius: number,
  duration: number,
) {
  document.getElementById(THEME_TRANSITION_STYLE_ID)?.remove();

  const mask = createBlurCircleMask();
  const finalMaskSize = radius * 2.5;
  const finalMaskX = x - finalMaskSize / 2;
  const finalMaskY = y - finalMaskSize / 2;
  const style = document.createElement("style");
  style.id = THEME_TRANSITION_STYLE_ID;
  style.textContent = `
    ::view-transition-new(root) {
      -webkit-mask-image: ${mask};
      mask-image: ${mask};
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      animation: boardui-theme-mask-reveal ${duration}ms ${THEME_TRANSITION_EASING} both;
      transform-origin: ${x}px ${y}px;
      will-change: -webkit-mask-size, -webkit-mask-position, mask-size, mask-position;
    }

    @keyframes boardui-theme-mask-reveal {
      from {
        -webkit-mask-position: ${x}px ${y}px;
        mask-position: ${x}px ${y}px;
        -webkit-mask-size: 0px 0px;
        mask-size: 0px 0px;
      }
      to {
        -webkit-mask-position: ${finalMaskX}px ${finalMaskY}px;
        mask-position: ${finalMaskX}px ${finalMaskY}px;
        -webkit-mask-size: ${finalMaskSize}px ${finalMaskSize}px;
        mask-size: ${finalMaskSize}px ${finalMaskSize}px;
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}

function storedTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemeMode, { persist = true }: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The control remains usable when storage is blocked or unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

function elementCenter(element: HTMLElement | null): ThemeTransitionOrigin {
  if (!element) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function normalizedOrigin(
  origin: ThemeTransitionOrigin | null,
  element: HTMLElement | null,
): ThemeTransitionOrigin {
  const fallback = elementCenter(element);
  const x = origin?.x ?? fallback.x;
  const y = origin?.y ?? fallback.y;
  return {
    x: Math.min(Math.max(x, 0), window.innerWidth),
    y: Math.min(Math.max(y, 0), window.innerHeight),
  };
}

/**
 * Reveals the next theme from the interaction point using the View Transition
 * API. Keyboard activation starts at the control's center. Unsupported
 * browsers and reduced-motion users receive the same immediate theme change.
 */
export async function applyThemeWithTransition(
  theme: ThemeMode,
  {
    origin = null,
    element = null,
    duration = THEME_TRANSITION_DURATION,
  }: {
    origin?: ThemeTransitionOrigin | null;
    element?: HTMLElement | null;
    duration?: number;
  } = {},
) {
  if (typeof document === "undefined" || currentTheme() === theme) return;

  const transitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!transitionDocument.startViewTransition || reduceMotion) {
    applyTheme(theme);
    return;
  }
  if (themeTransitionRunning) return;

  const { x, y } = normalizedOrigin(origin, element);
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  themeTransitionRunning = true;
  document.documentElement.classList.add("theme-transitioning");
  const transitionStyle = installThemeTransitionStyle({ x, y }, radius, duration);
  try {
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => applyTheme(theme));
    });

    await transition.ready;
    await transition.finished;
  } catch {
    // If the browser aborts a transition mid-flight, the theme still changes.
    if (currentTheme() !== theme) applyTheme(theme);
  } finally {
    transitionStyle.remove();
    document.documentElement.classList.remove("theme-transitioning");
    themeTransitionRunning = false;
  }
}

function currentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const onThemeChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(event.newValue === "dark" ? "dark" : "light", { persist: false });
  };
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}

export interface ThemeToggleProps {
  /** Compact icon-only treatment for a collapsed sidebar rail. */
  collapsed?: boolean;
  /**
   * Visual treatment for the control. `glass-segmented` is the landing nav's
   * skin: literal black/white rather than theme tokens, because it sits on the
   * hero shader's near-white band in both themes and a token that follows the
   * page would invert out of sight in dark mode.
   */
  appearance?: "sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented";
  className?: string;
  /** Circular reveal duration in milliseconds. */
  transitionDuration?: number;
}

/** Manual light/dark control. It never reads the operating-system theme. */
export function ThemeToggle({
  collapsed = false,
  appearance = "sidebar",
  className,
  transitionDuration = THEME_TRANSITION_DURATION,
}: ThemeToggleProps) {
  const theme = useThemeMode();
  const dark = theme === "dark";
  const switchRef = useRef<HTMLLabelElement | null>(null);
  const pointerOriginRef = useRef<ThemeTransitionOrigin | null>(null);

  // Makes the component self-contained in customer projects. BoardUI itself
  // also runs the same lookup before hydration to avoid a first-paint flash.
  useEffect(() => {
    applyTheme(storedTheme(), { persist: false });
  }, []);

  if (
    appearance === "segmented" ||
    appearance === "sidebar-segmented" ||
    appearance === "glass-segmented"
  ) {
    const glass = appearance === "glass-segmented";
    const sidebarSurface = appearance === "sidebar-segmented";
    const options = [
      { mode: "light" as const, label: "Use light mode", Icon: RiSunLine },
      { mode: "dark" as const, label: "Use dark mode", Icon: RiMoonLine },
    ];

    return (
      <div
        role="group"
        aria-label="Theme"
        className={cx(
          "relative inline-flex w-fit items-center gap-1 rounded-full p-1",
          // Mobile: 2px padding + 28px segments = 32px tall, matching the
          // small icon buttons beside it. Desktop keeps the roomier 40px.
          glass && "p-0.5 sm:p-1",
          glass
            ? // No track of its own: the host supplies the surface. A fill
              // here would paint over it. Kept registry-safe — this component
              // never imports the landing page's glass.
              "z-10 bg-transparent"
            : sidebarSurface
              ? "bg-theme-toggle-sidebar-background"
              : "bg-background-secondary-default",
          className,
        )}
      >
        <span
          aria-hidden
          className={cx(
            "pointer-events-none absolute top-1 left-1 size-8 rounded-full",
            "shadow-xs transition-transform duration-200 ease",
            glass && "top-0.5 left-0.5 size-7 sm:top-1 sm:left-1 sm:size-8",
            glass
              ? "bg-white dark:bg-[#2e2e33]"
              : sidebarSurface
                ? "bg-theme-toggle-sidebar-selected-background"
                : "bg-background-primary-default",
            // Segment width + the 4px gap: 28+4 on mobile, 32+4 above it.
            dark && (glass ? "translate-x-8 sm:translate-x-9" : "translate-x-9"),
          )}
        />
        {options.map(({ mode, label, Icon }) => {
          const selected = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              title={mode === "light" ? "Light mode" : "Dark mode"}
              onClick={(event) => {
                if (selected) return;
                const pointerOrigin =
                  event.clientX === 0 && event.clientY === 0
                    ? null
                    : { x: event.clientX, y: event.clientY };
                void applyThemeWithTransition(mode, {
                  origin: pointerOrigin,
                  element: event.currentTarget,
                  duration: transitionDuration,
                });
              }}
              className={cx(
                "relative z-10 grid size-8 cursor-pointer place-items-center rounded-full outline-none",
                glass && "size-7 sm:size-8",
                "transition-colors duration-150 ease",
                "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                glass
                  ? selected
                    ? // Reads against the selected pill, which is white in
                      // light and dark grey in dark — so it flips with it.
                      "text-black dark:text-white"
                    : "text-black/45 hover:text-black/70 dark:text-white/45 dark:hover:text-white/70"
                  : selected
                    ? "text-foreground-icon-primary"
                    : "text-foreground-icon-secondary hover:text-foreground-icon-primary",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>
    );
  }

  if (collapsed) {
    const Icon = dark ? RiSunLine : RiMoonLine;
    return (
      <button
        type="button"
        aria-label={dark ? "Use light mode" : "Use dark mode"}
        aria-pressed={dark}
        title={dark ? "Light mode" : "Dark mode"}
        onClick={(event) => {
          const pointerOrigin =
            event.clientX === 0 && event.clientY === 0
              ? null
              : { x: event.clientX, y: event.clientY };
          void applyThemeWithTransition(dark ? "light" : "dark", {
            origin: pointerOrigin,
            element: event.currentTarget,
            duration: transitionDuration,
          });
        }}
        className={cx(
          "flex size-9 cursor-pointer items-center justify-center rounded-2lg",
          "text-foreground-icon-secondary transition-colors duration-150 ease",
          "hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          className,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </button>
    );
  }

  return (
    <AriaSwitch
      ref={switchRef}
      isSelected={dark}
      onPointerDown={(event) => {
        pointerOriginRef.current = { x: event.clientX, y: event.clientY };
      }}
      onChange={(selected) => {
        const origin = pointerOriginRef.current;
        pointerOriginRef.current = null;
        void applyThemeWithTransition(selected ? "dark" : "light", {
          origin,
          element: switchRef.current,
          duration: transitionDuration,
        });
      }}
      aria-label="Dark mode"
      className={({ isFocusVisible }) =>
        cx(
          "flex w-full cursor-pointer items-center justify-between rounded-2lg p-2",
          "transition-colors duration-150 ease hover:bg-background-secondary-hover",
          isFocusVisible && "ring-2 ring-inset ring-border-focus-ring",
          className,
        )
      }
    >
      {(state) => (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <RiMoonLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="text-body-medium text-text-secondary">Dark mode</span>
          </span>
          <SwitchTrack state={state} size="sm" shape="pill" />
        </>
      )}
    </AriaSwitch>
  );
}
