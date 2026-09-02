"use client";

import { RiInbox2Line } from "@remixicon/react";

import { AppShell } from "@/components/application/app-shell/app-shell";
import { STARTER_NOTIFICATIONS } from "@/components/application/app-shell/starter-notifications";
import { NotificationCenter } from "@/components/application/notification-center/notification-center";

export default function InboxPage() {
  return (
    <AppShell title="Inbox" icon={RiInbox2Line}>
      <NotificationCenter notifications={STARTER_NOTIFICATIONS} />
    </AppShell>
  );
}
