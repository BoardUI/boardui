"use client";

import { useState, type ReactNode } from "react";
import { RiAddLine, RiMoreFill } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { PillTab, PillTabList } from "@/components/base/tabs/pill-tab";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { Switch } from "@/components/base/switch/switch";
import { ChevronUpDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";
import { SettingsCard, SettingsRow, SettingsSectionLabel } from "./settings-rows";

/**
 * The settings modal's Tools page — MCP server management, structured after
 * the classic tools/servers settings layout: a scope switcher (per-project
 * pills), an Authentication toggle, the selected scope's server list, an
 * empty-state Team section, and the global Plugin servers.
 *
 * No Figma frame for this page — composed from the settings modal's own
 * recipes (SettingsCard/SettingsRow chrome, Switch, secondary Buttons, the
 * dropdown menu pattern) plus page-local pieces that follow the system:
 * icon tiles use the inbox-feed swatch pairs (bg-*-200 / text-*-700), the
 * status dot is ringed with the card background like the sidebar's badge
 * treatments, and the expandable tool list reuses the grid-rows grow
 * transition from the Storage table.
 */

/* ------------------------------------------------------------------- data */

type ServerStatus = "connected" | "error";

interface McpServer {
  id: string;
  name: string;
  /** Letter tile — bg/text pair from the swatch palette. */
  initial: string;
  tileClass: string;
  status: ServerStatus;
  /** e.g. "26 tools, 1 prompts, 104 resources enabled" */
  summary?: string;
  /** Names revealed by the expander chevron. */
  tools?: string[];
}

const SERVERS: Record<string, McpServer> = {
  astro: {
    id: "astro",
    name: "astro",
    initial: "A",
    tileClass: "bg-background-tertiary-default text-text-secondary",
    status: "error",
  },
  figma: {
    id: "figma",
    name: "Figma",
    initial: "F",
    tileClass: "bg-pink-200 text-pink-700",
    status: "connected",
    summary: "26 tools, 1 prompts, 104 resources enabled",
    tools: ["get_design_context", "get_metadata", "get_screenshot", "get_variable_defs", "create_new_file"],
  },
  paper: {
    id: "paper",
    name: "paper",
    initial: "P",
    tileClass: "bg-blue-200 text-blue-700",
    status: "error",
  },
  posthog: {
    id: "posthog",
    name: "posthog",
    initial: "P",
    tileClass: "bg-amber-200 text-amber-700",
    status: "connected",
    summary: "521 tools, 173 resources enabled",
    tools: ["query_insights", "list_dashboards", "capture_event", "feature_flags", "session_recordings"],
  },
  vercel: {
    id: "vercel",
    name: "vercel",
    initial: "V",
    tileClass: "bg-neutral-950 text-white",
    status: "connected",
    summary: "30 tools, 13 prompts enabled",
    tools: ["list_deployments", "get_build_logs", "promote_deployment", "env_variables"],
  },
};

/** Per-scope server lists — switching a pill swaps the section below. */
const SCOPES: { id: string; label: string; servers: McpServer[] }[] = [
  { id: "home", label: "Home", servers: [SERVERS.astro, SERVERS.figma] },
  { id: "boardui", label: "boardui", servers: [SERVERS.figma, SERVERS.vercel] },
  { id: "iospoke", label: "iospoke", servers: [SERVERS.astro] },
  { id: "mideo", label: "mideo", servers: [SERVERS.posthog] },
  { id: "bereal", label: "BeReal Task", servers: [SERVERS.figma] },
  { id: "poke", label: "poke-1", servers: [] },
  { id: "cloud", label: "Cloud", servers: [SERVERS.vercel, SERVERS.posthog] },
];

const PLUGIN_SERVERS: McpServer[] = [SERVERS.paper, SERVERS.posthog, SERVERS.vercel];

/* ----------------------------------------------------------------- pieces */

/** 32px rounded letter tile with a connection dot pinned to its corner,
 *  ringed in the card background so it reads as punched-through. */
function ServerTile({ server }: { server: McpServer }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg">
      <span
        className={cx(
          "flex size-8 items-center justify-center rounded-lg text-body-2-medium",
          server.tileClass,
        )}
      >
        {server.initial}
      </span>
      <span
        aria-hidden
        className={cx(
          "absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full ring-2 ring-background-secondary-default",
          server.status === "connected" ? "bg-green-500" : "bg-red-600",
        )}
      />
    </span>
  );
}

/** Bare "…" row action — quieter than IconButton on the grey card, same
 *  hover language as the sidebar rows. Opens the shared dropdown menu. */
function ServerMenu({ name }: { name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger
        aria-label={`Actions for ${name}`}
        className={cx(
          "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md",
          "text-foreground-icon-secondary outline-none transition-colors duration-150 ease",
          "hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          isOpen && "bg-background-secondary-hover",
        )}
      >
        <RiMoreFill className="size-4 shrink-0" aria-hidden />
      </DropdownTrigger>
      <DropdownPopover aria-label={`Actions for ${name}`} placement="bottom end" className="w-[180px] p-2">
        <DropdownGroup>
          {["Show output", "Refresh tools", "Remove server"].map((label) => (
            <DropdownItem key={label} onSelect={() => setIsOpen(false)} className="px-2 py-1.5">
              <span className="truncate text-body-medium whitespace-nowrap text-text-primary">{label}</span>
            </DropdownItem>
          ))}
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

/** Quiet inline text action ("Logout", "Show Output"). */
function InlineAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "cursor-pointer rounded-sm text-body-2-regular whitespace-nowrap text-text-tertiary",
        "outline-none transition-colors duration-150 ease",
        "hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
      )}
    >
      {children}
    </button>
  );
}

function ServerRow({ server }: { server: McpServer }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-separator-border py-2.5 pr-2.5 last:border-b-0">
      <div className="flex w-full items-center gap-2.5">
        <ServerTile server={server} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <p className="text-body-medium whitespace-nowrap text-text-primary">{server.name}</p>
            <InlineAction>Logout</InlineAction>
          </div>
          {server.status === "connected" ? (
            <div className="flex items-center gap-1">
              <p className="truncate text-body-2-regular text-text-secondary">{server.summary}</p>
              {server.tools && (
                <button
                  type="button"
                  aria-label={`${expanded ? "Hide" : "Show"} ${server.name} tools`}
                  aria-expanded={expanded}
                  onClick={() => setExpanded((v) => !v)}
                  className={cx(
                    "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-xs",
                    "text-foreground-icon-tertiary outline-none transition-colors duration-150 ease",
                    "hover:text-foreground-icon-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  )}
                >
                  <ChevronUpDownSmall className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="text-body-2-regular whitespace-nowrap text-text-secondary">Error</p>
              <span className="text-body-2-regular text-text-tertiary">–</span>
              <InlineAction>Show Output</InlineAction>
            </div>
          )}
        </div>
        <ServerMenu name={server.name} />
      </div>

      {/* Expandable tool chips — same grid-rows grow transition as the
          Storage table's new-row entrance, but as a two-way toggle. */}
      {server.tools && (
        <div
          className={cx(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap gap-1.5 pt-2 pl-[42px]">
              {server.tools.map((tool) => (
                <Chip key={tool} variant="caption" color="soft">
                  {tool}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewServerRow() {
  return (
    <button
      type="button"
      className={cx(
        "group flex w-full cursor-pointer items-center gap-2.5 py-2.5 pr-2.5 text-left",
        "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
      )}
    >
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-tertiary-default",
          "transition-colors duration-150 ease group-hover:bg-background-tertiary-hover",
        )}
      >
        <RiAddLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body-medium whitespace-nowrap text-text-primary">New MCP Server</span>
        <span className="text-body-2-regular whitespace-nowrap text-text-secondary">
          Add a Custom MCP Server
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------- page */

export function SettingsTools() {
  const [scopeId, setScopeId] = useState("home");
  const [waitForAuth, setWaitForAuth] = useState(true);
  const scope = SCOPES.find((s) => s.id === scopeId) ?? SCOPES[0];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Scope switcher — the shared fully-rounded pill tabs (same component
          as the AI chat panel's Changes/Browser switcher). */}
      <PillTabList
        aria-label="Project scope"
        className="-mx-1 flex w-[calc(100%+8px)] overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCOPES.map((s) => (
          <PillTab key={s.id} variant="gray" isSelected={s.id === scopeId} onSelect={() => setScopeId(s.id)}>
            {s.label}
          </PillTab>
        ))}
      </PillTabList>

      {/* Authentication */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel className="px-2">Authentication</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Wait for MCP Authentication"
            description="Wait indefinitely to authenticate when prompted. When off, skip authentication prompts after 30 seconds."
          >
            <Switch isSelected={waitForAuth} onChange={setWaitForAuth} aria-label="Wait for MCP authentication" />
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Scope servers */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full flex-col gap-0.5">
          <SettingsSectionLabel className="px-2">{scope.label} MCP Servers</SettingsSectionLabel>
          <p className="w-full px-2 text-body-2-regular text-text-tertiary">
            Servers available from {scope.label}.
          </p>
        </div>
        <SettingsCard>
          {scope.servers.map((server) => (
            <ServerRow key={server.id} server={server} />
          ))}
          <NewServerRow />
        </SettingsCard>
      </div>

      {/* Team servers — empty state */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <SettingsSectionLabel className="px-2">Team MCP Servers</SettingsSectionLabel>
            <p className="w-full px-2 text-body-2-regular text-text-tertiary">
              Configured in the dashboard
            </p>
          </div>
          <Button variant="secondary" size="small" className="shrink-0">
            Manage
          </Button>
        </div>
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-background-secondary-default px-6 py-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-body-medium text-text-primary">No Team MCP Servers</p>
            <p className="max-w-[360px] text-body-2-regular text-text-secondary">
              Configure MCP servers in the dashboard to make them available in BoardUI on desktop
              and in the cloud.
            </p>
          </div>
          <Button variant="secondary" size="small">
            Configure Team MCP Servers
          </Button>
        </div>
      </div>

      {/* Plugin servers */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel className="px-2">Plugin MCP Servers</SettingsSectionLabel>
        <SettingsCard>
          {PLUGIN_SERVERS.map((server) => (
            <ServerRow key={server.id} server={server} />
          ))}
        </SettingsCard>
      </div>
    </div>
  );
}
