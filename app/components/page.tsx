"use client";

import { useState } from "react";
import { RiLayoutGridLine } from "@remixicon/react";

import {
  AppShell,
  CatalogTierFilter,
  ComponentsCatalog,
  type CatalogTier,
} from "@/components/application/app-shell/app-shell";

/** The starter's catalogue page: boardui.com/components, linking out. */
export default function ComponentsPage() {
  const [tier, setTier] = useState<CatalogTier>("all");
  return (
    <AppShell
      title="Components and Blocks"
      icon={RiLayoutGridLine}
      actions={<CatalogTierFilter tier={tier} onChange={setTier} />}
      columnClassName="max-w-[964px]"
    >
      <ComponentsCatalog tier={tier} />
    </AppShell>
  );
}
