"use client";

import { useState } from "react";
import { RiRestartLine } from "@remixicon/react";
import { DataGrid } from "@/components/application/data-grid/data-grid";
import type { DataGridColumn } from "@/components/application/data-grid/data-grid";
import { Button } from "@/components/base/buttons/button";

type Renewal = { id: string; account: string; owner: string; region: string; stage: string; seats: number; arr: number; health: number };
const REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America"];
const STAGES = ["Discovery", "Proposal", "Negotiation", "Committed", "Closed won"];
const OWNERS = ["Owen Park", "Tyler Hayes", "Marcus Johnson", "Daniel Kim", "Sarah Bennett"];
const ACCOUNTS = ["Northwind", "Lumen", "Cedar", "Brightline", "Harbor", "Pinecrest", "Atlas", "Summit", "Fieldstone", "Evergreen", "Meridian", "Redwood", "Westbridge", "Sterling", "Juniper", "Oakmont"];
const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const compactNumber = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const getRowId = (row: Renewal) => row.id;
const COLUMNS: DataGridColumn<Renewal>[] = [
  { key: "account", header: "Account", width: 220, validate: (value) => String(value).trim() ? undefined : "Account cannot be empty." },
  { key: "owner", header: "Owner", width: 172, type: "select", options: OWNERS },
  { key: "region", header: "Region", width: 172, type: "select", options: REGIONS },
  { key: "stage", header: "Stage", width: 156, type: "select", options: STAGES },
  { key: "seats", header: "Seats", width: 96, type: "number", min: 0, summary: "sum", formatSummary: compactNumber },
  { key: "arr", header: "ARR", width: 148, type: "number", min: 0, summary: "sum", format: (value) => currency(Number(value)), formatSummary: (value) => `$${compactNumber(value)}` },
  { key: "health", header: "Health", width: 112, type: "number", min: 0, max: 100, summary: "average", format: (value) => `${value}%`, formatSummary: (value) => `${value.toFixed(1)}%` },
];
const FIRST_ROWS: Omit<Renewal, "id" | "account">[] = [
  { owner: "Owen Park", region: "Latin America", stage: "Closed won", seats: 40, arr: 9600, health: 49 },
  { owner: "Tyler Hayes", region: "Europe", stage: "Closed won", seats: 105, arr: 37800, health: 90 },
  { owner: "Tyler Hayes", region: "Latin America", stage: "Proposal", seats: 230, arr: 96600, health: 64 },
  { owner: "Marcus Johnson", region: "Asia Pacific", stage: "Proposal", seats: 115, arr: 41400, health: 78 },
  { owner: "Daniel Kim", region: "Latin America", stage: "Committed", seats: 10, arr: 4200, health: 72 },
  { owner: "Marcus Johnson", region: "Europe", stage: "Closed won", seats: 470, arr: 169200, health: 72 },
  { owner: "Sarah Bennett", region: "Latin America", stage: "Discovery", seats: 45, arr: 16200, health: 95 },
  { owner: "Owen Park", region: "Asia Pacific", stage: "Negotiation", seats: 255, arr: 107100, health: 93 },
  { owner: "Marcus Johnson", region: "Europe", stage: "Discovery", seats: 660, arr: 237600, health: 82 },
];
function makeRows(count: number): Renewal[] {
  return Array.from({ length: count }, (_, i) => {
    const seats = 10 + ((i * 73 + 19) % 640);
    const values = FIRST_ROWS[i] ?? {
      owner: OWNERS[(i * 3) % OWNERS.length], region: REGIONS[(i * 7) % REGIONS.length], stage: STAGES[(i * 13) % STAGES.length], seats, arr: seats * (240 + (i % 4) * 60), health: 35 + ((i * 17) % 66),
    };
    return { id: `renewal-${i}`, account: `${ACCOUNTS[i % ACCOUNTS.length]} ${i < ACCOUNTS.length ? "Freight" : `Logistics ${Math.floor(i / ACCOUNTS.length)}`}`, ...values };
  });
}

export function DataGridExample({ rowCount = 10000, height = 396, showTitle = true }: { rowCount?: number; height?: number; showTitle?: boolean }) {
  const [data, setData] = useState(() => makeRows(rowCount));
  const [resetKey, setResetKey] = useState(0);
  const [changed, setChanged] = useState(false);
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {showTitle && <div className="flex items-center justify-between gap-4 px-1">
        <h3 className="text-headline-medium text-text-primary">Renewals</h3>
        <Button variant="secondary" size="small" leadingIcon={RiRestartLine} disabled={!changed} onClick={() => { setData(makeRows(rowCount)); setResetKey((key) => key + 1); setChanged(false); }}>Reset</Button>
      </div>}
      <DataGrid key={resetKey} aria-label="Renewals" data={data} columns={COLUMNS} getRowId={getRowId} onDataChange={(next) => { setData(next); setChanged(true); }} height={height} exportFileName="renewals.csv" />
    </div>
  );
}
