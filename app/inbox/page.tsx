"use client";

import { RiDownloadCloud2Line, RiGitPullRequestLine, RiShieldCheckLine } from "@remixicon/react";

import { AppShell } from "@/components/application/app-shell/app-shell";
import {
  NotificationCenter,
  type NotificationCenterItem,
} from "@/components/application/notification-center/notification-center";

/** Sample inbox. Three unread, matching the badge on the sidebar's Inbox row. */
const NOTIFICATIONS: NotificationCenterItem[] = [
  {
    id: "mention-notes",
    category: "mentions",
    group: "Today",
    title: "Livia mentioned you",
    description: "Can you review the new empty state before we ship the dashboard?",
    timestamp: "2m",
    unread: true,
    avatar: { initials: "LS", alt: "Livia Saris", color: "pink" },
    actions: [
      { id: "reply", label: "Reply", variant: "primary" },
      { id: "view", label: "View thread", variant: "secondary" },
    ],
  },
  {
    id: "backup-ready",
    category: "system",
    group: "Today",
    title: "Workspace backup is ready",
    description: "The nightly backup finished and is ready to download.",
    timestamp: "18m",
    unread: true,
    status: "success",
    icon: RiDownloadCloud2Line,
    actions: [{ id: "download", label: "Download", variant: "secondary" }],
  },
  {
    id: "review-request",
    category: "activity",
    group: "Today",
    title: "Review requested on the composer changes",
    description: "Mert opened a pull request that touches the chat composer and the thinking indicator.",
    timestamp: "1h",
    unread: true,
    icon: RiGitPullRequestLine,
    actions: [{ id: "review", label: "Review", variant: "primary" }],
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
  {
    id: "mention-launch",
    category: "mentions",
    group: "Yesterday",
    title: "Aspen mentioned you",
    description: "The launch checklist is done on my side. Anything left from yours?",
    timestamp: "1d",
    avatar: { initials: "AL", alt: "Aspen Lubin", color: "blue" },
  },
];

export default function InboxPage() {
  return (
    <AppShell title="Inbox">
      <NotificationCenter notifications={NOTIFICATIONS} />
    </AppShell>
  );
}
