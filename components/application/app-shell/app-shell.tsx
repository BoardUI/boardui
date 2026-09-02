"use client";

import { RiChatAiLine, RiCloseLine, RiDashboardLine, RiInbox2Line, RiMenuLine } from "@remixicon/react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/application/dashboard/dashboard-sidebar";
import { IconButton } from "@/components/base/buttons/icon-button";
import { cx } from "@/utils/cx";

/**
 * The starter's page frame: the sidebar, a drawer for phones, and a titled
 * content card. Every page of the starter except the chat renders inside it,
 * and the chat shares its navigation, so the sidebar only ever links to pages
 * the app actually has.
 *
 * On boardui.com the starter lives under /templates/chat-starter; in a
 * deployed copy it is the root. The base is read off the URL rather than
 * configured, so the same files run in both places untouched.
 */
export const STARTER_SITE_PREFIX = "/templates/chat-starter";

/** "" in a deployed starter, the site prefix on boardui.com. */
export function useStarterBase(): string {
  const pathname = usePathname() ?? "";
  const onSite =
    pathname === STARTER_SITE_PREFIX || pathname.startsWith(`${STARTER_SITE_PREFIX}/`);
  return onSite ? STARTER_SITE_PREFIX : "";
}

export function starterNav(base: string): DashboardNavItem[] {
  return [
    { key: "chat", label: "Chat", icon: RiChatAiLine, href: base || "/" },
    { key: "dashboard", label: "Dashboard", icon: RiDashboardLine, href: `${base}/dashboard` },
    { key: "inbox", label: "Inbox", icon: RiInbox2Line, href: `${base}/inbox`, badge: 3 },
  ];
}

/** The nav key of the page at the current URL. */
export function useStarterSelected(): string {
  const pathname = usePathname() ?? "";
  const base = useStarterBase();
  const rest = pathname.slice(base.length);
  if (rest.startsWith("/dashboard")) return "dashboard";
  if (rest.startsWith("/inbox")) return "inbox";
  return "chat";
}

export function AppShell({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const items = starterNav(useStarterBase());
  const selected = useStarterSelected();

  return (
    <div
      className={cx(
        "relative flex h-dvh w-full gap-4 overflow-hidden bg-background-full p-3",
        className,
      )}
    >
      <DashboardSidebar items={items} selected={selected} className="hidden lg:flex" />

      {/* Below lg the sidebar rides in as an overlay drawer. */}
      {navOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/40"
          />
          <div className="relative flex h-full p-3">
            <DashboardSidebar
              mobile
              items={items}
              selected={selected}
              onClose={() => setNavOpen(false)}
              className="flex"
            />
          </div>
        </div>
      )}

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-secondary-default">
        <header className="flex h-12 shrink-0 items-center gap-2 px-4 pt-[7px]">
          <IconButton
            icon={navOpen ? RiCloseLine : RiMenuLine}
            size="small"
            aria-label="Open navigation"
            onClick={() => setNavOpen((open) => !open)}
            className="lg:hidden"
          />
          <h1 className="text-headline-medium text-text-primary">{title}</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </main>
    </div>
  );
}
