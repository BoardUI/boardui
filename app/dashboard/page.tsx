"use client";

import { AppShell } from "@/components/application/app-shell/app-shell";
import { StatCards } from "@/components/application/dashboard/stat-cards";
import { DataTableExample } from "@/components/application/data-table/data-table";

/** The starter's dashboard page: stat cards over the customers table, both free. */
export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-4">
        <StatCards variant="footer" />
        <DataTableExample />
      </div>
    </AppShell>
  );
}
