"use client";

import { useRouter } from "next/navigation";

import { useStarterBase } from "@/components/application/app-shell/app-shell";
import {
  RiAddLine,
  RiDownloadLine,
  RiGlobalLine,
  RiLogoutBoxRLine,
  RiMore2Fill,
  RiSendPlaneLine,
  RiSettings3Line,
  RiSpeedUpLine,
} from "@remixicon/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Avatar } from "@/components/base/avatar/avatar";
import {
  Dropdown,
  DropdownGroup,
  DropdownDivider,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { ChevronDownSmall } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

/**
 * The chat-history rail, a card of its own beside the chat.
 *
 * It mirrors the structure of the app sidebar — an action at the top, a
 * section label, then a list of items with a relative-time badge — so the two
 * rails read as the same system from opposite sides of the workspace.
 *
 * Threads are held by the parent and kept in the visitor's own browser. That
 * is the honest ceiling for a starter with no database: hosted history across
 * devices is what a backend buys you, and this is the free version of it.
 */

export interface ChatThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
  unread?: boolean;
}

export interface AgentChatHistoryProps {
  threads: ChatThreadSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onToggleUnread: (id: string) => void;
  onDelete: (id: string) => void;
  /** Downloads the stored chats as JSON. */
  onExport: () => void;
  /** Disables switching mid-stream, which would strand the running response. */
  disabled?: boolean;
  className?: string;
}

export function AgentChatHistory({
  threads,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onToggleUnread,
  onDelete,
  onExport,
  disabled = false,
  className,
}: AgentChatHistoryProps) {
  return (
    <aside
      aria-label="Chat history"
      className={cx(
        // A card of its own beside the chat rather than a panel within it, the
        // way the Pro template seats its code panel: same surface and radius as
        // the chat card, separated by the workspace gap. Full height, and its
        // own padding, since it no longer borrows the chat card's.
        "flex h-full w-[260px] shrink-0 flex-col gap-6 overflow-hidden rounded-3xl bg-background-secondary-default p-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="flex w-full cursor-pointer items-center gap-2 rounded-2lg px-2 py-2 text-body-medium text-text-primary transition-colors hover:bg-background-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RiAddLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
        New chat
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:none]">
        <p className="px-2 pb-1 text-body-2-medium text-text-tertiary">Recent</p>

        {threads.length === 0 ? (
          <p className="px-2 text-body-2-regular text-text-tertiary">
            Chats you start show up here.
          </p>
        ) : (
          threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              active={thread.id === activeId}
              disabled={disabled}
              onSelect={onSelect}
              onRename={onRename}
              onToggleUnread={onToggleUnread}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <RailFooter threads={threads} onExport={onExport} />
    </aside>
  );
}

/**
 * The account strip along the bottom of the rail.
 *
 * The trailing control downloads the stored chats as JSON. It does something
 * real on purpose — this rail's whole premise is that history lives in the
 * visitor's own browser, and the one thing that premise owes them is a way to
 * take it with them.
 */
function RailFooter({
  threads,
  onExport,
}: {
  threads: ChatThreadSummary[];
  onExport: () => void;
}) {
  const count = threads.length;
  const label = count === 0 ? "No chats to export" : `Export ${count} chats`;
  return (
    <div className="mt-auto flex items-center gap-1 border-t border-separator-border pt-3 pr-1">
      <AccountMenu threads={threads} />
      <button
        type="button"
        onClick={onExport}
        disabled={count === 0}
        aria-label={label}
        title={label}
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-button-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RiDownloadLine className="size-3.5 shrink-0" aria-hidden />
      </button>
    </div>
  );
}

/** The rail keeps at most this many chats, which is what makes "chats" a real
 *  quota rather than a decorative percentage. Mirrors MAX_THREADS in the shell. */
const THREAD_CAPACITY = 30;
/** localStorage is about 5MB in practice; enough to make the number mean something. */
const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;

/**
 * The account switcher at the foot of the rail: avatar, name, chevron, and a
 * grouped menu built from the same pieces as the app sidebar's team card, so
 * the two read as one system.
 *
 * "Usage left" expands in place. Its numbers are the starter's actual
 * limits — how many of the retained chats are used, and how much of the
 * browser's storage they occupy — rather than invented percentages, so the row
 * still means something once this ships inside someone else's app.
 */
function AccountMenu({ threads }: { threads: ChatThreadSummary[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [storedBytes, setStoredBytes] = useState(0);
  const close = () => setIsOpen(false);
  const router = useRouter();
  const base = useStarterBase();
  const logOut = () => {
    close();
    router.push(`${base}/login`);
  };

  const chatPercent = Math.min(100, Math.round((threads.length / THREAD_CAPACITY) * 100));
  const storagePercent = Math.min(100, Math.round((storedBytes / STORAGE_BUDGET_BYTES) * 100));

  const toggleUsage = () => {
    // Measured when the section opens rather than on every render: it reads
    // localStorage, which is outside React and not free.
    if (!usageOpen) setStoredBytes(measureStoredBytes());
    setUsageOpen((open) => !open);
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setUsageOpen(false);
      }}
    >
      <DropdownTrigger
        aria-label="Mertcan Esmergul account menu"
        className={cx(
          "flex min-w-0 flex-1 items-center gap-2 rounded-2lg px-1 py-1 text-left",
          "transition-colors hover:bg-background-secondary-hover",
          isOpen && "bg-background-secondary-hover",
        )}
      >
        <Avatar size="sm" initials="M" color="neutral" alt="Mertcan Esmergul" />
        <span className="min-w-0 flex-1 truncate text-body-2-medium text-text-primary">
          Mertcan Esmergul
        </span>
      </DropdownTrigger>

      <DropdownPopover
        aria-label="Account menu"
        placement="top start"
        className="w-[248px] p-2.5"
        dialogClassName="gap-[7px]"
      >
        <DropdownGroup>
          <button
            type="button"
            onClick={toggleUsage}
            aria-expanded={usageOpen}
            className="flex w-full cursor-pointer items-center gap-2 rounded-2lg px-2 py-1.5 text-left transition-colors hover:bg-background-secondary-default"
          >
            <RiSpeedUpLine className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="flex-1 truncate text-body-medium whitespace-nowrap text-text-primary">
              Usage left
            </span>
            <ChevronDownSmall
              className={cx(
                "size-4 shrink-0 text-foreground-icon-secondary transition-transform duration-150",
                usageOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {usageOpen && (
            <div className="flex flex-col gap-1 pb-1">
              <UsageRow label="Chats" value={`${threads.length} of ${THREAD_CAPACITY}`} percent={chatPercent} />
              <UsageRow label="Storage" value={formatBytes(storedBytes)} percent={storagePercent} />
              <button
                type="button"
                onClick={close}
                className="flex w-full cursor-pointer items-center gap-2 rounded-2lg py-1 pr-2 pl-9 text-left transition-colors hover:bg-background-secondary-default"
              >
                <span className="flex-1 truncate text-body-2-medium whitespace-nowrap text-text-primary">
                  Upgrade to Max
                </span>
                <RiGlobalLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
              </button>
            </div>
          )}

          <DropdownItem onSelect={close} className="px-2 py-1.5">
            <RiSendPlaneLine className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
              Invite a friend
            </span>
          </DropdownItem>
          <DropdownItem onSelect={close} className="px-2 py-1.5">
            <RiSettings3Line className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
              Settings
            </span>
          </DropdownItem>
        </DropdownGroup>

        <DropdownDivider />

        <DropdownGroup>
          <DropdownItem onSelect={logOut} className="px-2 py-1.5">
            <RiLogoutBoxRLine className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
              Log out
            </span>
          </DropdownItem>
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

/** A measured line under "Usage left": what it is, how much, how full. */
function UsageRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="flex items-center gap-2 py-0.5 pr-2 pl-9">
      <span className="flex-1 truncate text-body-2-medium text-text-primary">{label}</span>
      <span className="shrink-0 text-body-2-regular text-text-secondary">{value}</span>
      <span className="w-9 shrink-0 text-right text-body-2-regular text-text-tertiary">{percent}%</span>
    </div>
  );
}

/** Bytes the stored chats occupy. UTF-16 in storage, so two bytes a character. */
function measureStoredBytes() {
  try {
    return (window.localStorage.getItem("boardui:agent-chat-threads")?.length ?? 0) * 2;
  } catch {
    return 0;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ThreadRow({
  thread,
  active,
  disabled,
  onSelect,
  onRename,
  onToggleUnread,
  onDelete,
}: {
  thread: ChatThreadSummary;
  active: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleUnread: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [renaming]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== thread.title) onRename(thread.id, next);
    setRenaming(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(thread.title);
      setRenaming(false);
    }
  };

  if (renaming) {
    return (
      <div className="rounded-2lg bg-background-secondary-hover px-2 py-1.5">
        <label className="sr-only" htmlFor={`rename-${thread.id}`}>
          Rename chat
        </label>
        <input
          id={`rename-${thread.id}`}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          className="w-full bg-transparent text-body-2-regular text-text-primary outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={cx(
        "group/row relative flex items-center rounded-2lg transition-colors",
        // Stepped off the rail's own surface. The rail moved to `secondary`
        // when it became a card of its own, and `primary-hover` resolves to
        // exactly that colour in light — selection would have been invisible.
        // Selection and hover share the fill, so hovering previews selecting.
        active || menuOpen
          ? "bg-background-secondary-hover"
          : "hover:bg-background-secondary-hover",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        disabled={disabled}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-1.5 pl-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        {thread.unread && (
          <span
            aria-label="Unread"
            className="size-1.5 shrink-0 rounded-full bg-button-primary"
          />
        )}
        <span
          className={cx(
            "min-w-0 flex-1 truncate text-body-2-regular",
            thread.unread ? "text-text-primary" : "text-text-secondary",
          )}
        >
          {thread.title}
        </span>
      </button>

      {/* The age and the menu share one slot: the age steps aside on hover so
          the control appears in place rather than shifting the title.
          The two must never be visible together, so they are driven by one
          condition each way. `focus-visible` rather than `focus-within` is the
          load-bearing part: closing the menu with the pointer hands focus back
          to the trigger, and `focus-within` would keep the icon lit on top of
          the age that has already returned. */}
      <span className="group/slot relative flex size-7 shrink-0 items-center justify-center pr-1">
        <span
          aria-hidden={menuOpen}
          className={cx(
            "text-caption-1-regular text-text-tertiary transition-opacity",
            menuOpen
              ? "opacity-0"
              : "opacity-100 group-hover/row:opacity-0 group-has-[:focus-visible]/slot:opacity-0",
          )}
        >
          {relativeTime(thread.updatedAt)}
        </span>

        <span
          className={cx(
            // Nudged 1px left of the age badge's centre: the glyph reads as
            // sitting slightly right in its own box, so the optical centre and
            // the geometric one do not agree.
            "absolute inset-0 flex -translate-x-px items-center justify-center transition-opacity",
            menuOpen
              ? "opacity-100"
              : "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/slot:opacity-100",
          )}
        >
          <RowMenu
            title={thread.title}
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
            onRename={() => {
              setDraft(thread.title);
              setRenaming(true);
            }}
            onToggleUnread={() => onToggleUnread(thread.id)}
            onDelete={() => onDelete(thread.id)}
          />
        </span>
      </span>
    </div>
  );
}

/** DropdownTrigger is itself the button, so it is styled directly — putting an
 *  IconButton inside it would nest one button in another. */
function RowMenu({
  title,
  isOpen,
  onOpenChange,
  onRename,
  onToggleUnread,
  onDelete,
}: {
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onToggleUnread: () => void;
  onDelete: () => void;
}) {
  const choose = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      <DropdownTrigger
        aria-label={`More actions for ${title}`}
        className={cx(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
          "text-foreground-icon-secondary transition-colors duration-150 ease",
          "hover:bg-background-tertiary-default hover:text-foreground-icon-primary",
          isOpen && "bg-background-tertiary-default text-foreground-icon-primary",
        )}
      >
        <RiMore2Fill className="size-4 shrink-0" aria-hidden />
      </DropdownTrigger>

      <DropdownPopover
        aria-label={`More actions for ${title}`}
        placement="bottom end"
        className="w-[190px] p-2"
      >
        <DropdownGroup>
          <DropdownItem onSelect={choose(onRename)} className="px-2 py-1.5">
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">Rename</span>
          </DropdownItem>
          <DropdownItem onSelect={choose(onToggleUnread)} className="px-2 py-1.5">
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
              Mark as unread
            </span>
          </DropdownItem>
          <DropdownItem onSelect={choose(onDelete)} className="px-2 py-1.5">
            <span className="truncate text-body-medium whitespace-nowrap text-text-error-primary">Delete</span>
          </DropdownItem>
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

/** Compact ages for a narrow badge: now, 34m, 5h, 18h, 3d. */
function relativeTime(at: number) {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
