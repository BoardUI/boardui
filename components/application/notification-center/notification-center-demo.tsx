"use client";

import {
  RiDownloadCloud2Line,
  RiGitPullRequestLine,
  RiShieldCheckLine,
  RiUserAddLine,
} from "@remixicon/react";
import {
  NotificationCenter,
  type NotificationCenterItem,
} from "@/components/application/notification-center/notification-center";

const notifications: NotificationCenterItem[] = [
  {
    id: "mention-notes",
    category: "mentions",
    group: "Today",
    title: "Livia mentioned you",
    description: "Can you review the new empty state before we ship the dashboard?",
    timestamp: "2m",
    unread: true,
    avatar: { src: "/avatars/livia-saris.webp", alt: "Livia Saris" },
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
    description: "The July 23 backup finished successfully and is ready to download.",
    timestamp: "18m",
    unread: true,
    status: "success",
    icon: RiDownloadCloud2Line,
    actions: [{ id: "download", label: "Download", variant: "secondary" }],
  },
  {
    id: "project-invite",
    category: "activity",
    group: "Today",
    title: "You joined Project Sea",
    description: "Maria added you as an editor. You now have access to all project files.",
    timestamp: "1h",
    unread: true,
    icon: RiUserAddLine,
    status: "information",
  },
  {
    id: "pull-request",
    category: "mentions",
    group: "Earlier this week",
    title: "Jaydon requested your review",
    description: "Pull request #284 updates the notification preferences flow.",
    timestamp: "Mon",
    avatar: { src: "/avatars/jaydon-aminoff.webp", alt: "Jaydon Aminoff" },
    actions: [{ id: "review", label: "Review changes", variant: "secondary" }],
  },
  {
    id: "security-check",
    category: "system",
    group: "Earlier this week",
    title: "Security check completed",
    description: "No exposed credentials or vulnerable dependencies were found.",
    timestamp: "Sun",
    status: "success",
    icon: RiShieldCheckLine,
  },
  {
    id: "deploy-failed",
    category: "system",
    group: "Earlier this week",
    title: "Preview deployment failed",
    description: "The build stopped while validating the application routes.",
    timestamp: "Sat",
    unread: true,
    status: "error",
    icon: RiGitPullRequestLine,
    actions: [
      { id: "retry", label: "Retry", variant: "primary" },
      { id: "logs", label: "View logs", variant: "secondary" },
    ],
  },
];

export function NotificationCenterDemo() {
  return <NotificationCenter notifications={notifications} />;
}
