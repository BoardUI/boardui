"use client";

import { RiHomeLine } from "@remixicon/react";

import { AppShell } from "@/components/application/app-shell/app-shell";
import { OrdersChartCard } from "@/components/application/dashboard/orders-chart-card";
import { RevenueChartCard } from "@/components/application/dashboard/revenue-chart-card";
import { StatCards } from "@/components/application/dashboard/stat-cards";
import { DataTableExample } from "@/components/application/data-table/data-table";

/**
 * The starter's dashboard page: stat cards, the two free chart cards side by
 * side, then the customers table.
 */
export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" heading="Welcome Mertcan" icon={RiHomeLine}>
      <StatCards variant="footer" />

      <div className="flex w-full flex-col items-stretch gap-4 xl:flex-row">
        <RevenueChartCard />
        <OrdersChartCard />
      </div>

      <DataTableExample />
    </AppShell>
  );
}
