"use client";

import { RiHomeLine, RiShieldCheckLine, RiSparklingLine } from "@remixicon/react";

import { AppShell } from "@/components/application/app-shell/app-shell";
import { RevenueChartCard } from "@/components/application/dashboard/revenue-chart-card";
import { StatCards } from "@/components/application/dashboard/stat-cards";
import { DataTableExample } from "@/components/application/data-table/data-table";
import {
  NotificationCenter,
  type NotificationCenterItem,
} from "@/components/application/notification-center/notification-center";

/** A slice of the inbox: what the workspace did lately, as a dashboard feed. */
const RECENT_ACTIVITY: NotificationCenterItem[] = [
  {
    id: "answered",
    category: "activity",
    group: "Today",
    title: "The assistant answered 14 chats",
    description: "Longest thread was 9 turns, on the launch checklist.",
    timestamp: "1h",
    unread: true,
    icon: RiSparklingLine,
  },
  {
    id: "mention",
    category: "mentions",
    group: "Today",
    title: "Livia mentioned you",
    description: "Can you review the new empty state before we ship the dashboard?",
    timestamp: "2h",
    unread: true,
    avatar: { initials: "LS", alt: "Livia Saris", color: "pink" },
  },
  {
    id: "key-rotated",
    category: "system",
    group: "Yesterday",
    title: "API key rotated",
    description: "The model provider key was replaced. Deployments pick it up on the next build.",
    timestamp: "1d",
    status: "information",
    icon: RiShieldCheckLine,
  },
];

/**
 * The starter's dashboard page: stat cards, a row with the activity feed and
 * the revenue chart, then the customers table. All free components.
 */
export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" heading="Welcome Mertcan" icon={RiHomeLine}>
      <StatCards variant="footer" />

      <div className="flex w-full flex-col items-stretch gap-4 xl:flex-row">
        <div className="w-full xl:w-[440px] xl:shrink-0">
          <NotificationCenter title="Recent activity" notifications={RECENT_ACTIVITY} />
        </div>
        <RevenueChartCard className="h-auto min-h-[329px] xl:h-auto" />
      </div>

      <DataTableExample />
    </AppShell>
  );
}
