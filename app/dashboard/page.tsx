"use client";

import { RiHomeLine } from "@remixicon/react";

import { AppShell } from "@/components/application/app-shell/app-shell";
import { StatCards } from "@/components/application/dashboard/stat-cards";
import { DataTableExample } from "@/components/application/data-table/data-table";

/** The starter's dashboard page: stat cards over the customers table, both free. */
export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" heading="Welcome Mertcan" icon={RiHomeLine}>
      <StatCards variant="footer" />
      <DataTableExample />
    </AppShell>
  );
}
