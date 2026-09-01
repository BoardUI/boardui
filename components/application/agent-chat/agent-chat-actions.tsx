"use client";

import { RiCheckLine, RiMoreFill, RiUploadLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

/**
 * The controls in the top right of the chat surface: share the open chat, and
 * a menu of the actions that apply to it.
 *
 * Every entry does something the starter can actually do — copy, download,
 * mark, delete. Nothing here is a placeholder waiting on a backend, because a
 * control that looks live and does nothing is worse than no control.
 */

export interface AgentChatActionsProps {
  /** Plain-text transcript of the open chat, for share and copy. */
  transcript: string;
  onExport: () => void;
  onToggleUnread: () => void;
  onDelete: () => void;
  /** No chat open yet, so there is nothing to act on. */
  disabled?: boolean;
  className?: string;
}

export function AgentChatActions({
  transcript,
  onExport,
  onToggleUnread,
  onDelete,
  disabled = false,
  className,
}: AgentChatActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!shared) return;
    const timer = setTimeout(() => setShared(false), 1600);
    return () => clearTimeout(timer);
  }, [shared]);

  const share = async () => {
    if (!transcript) return;
    // The Web Share sheet where the browser has one, the clipboard everywhere
    // else. Both leave the transcript on the device.
    try {
      if (navigator.share) {
        await navigator.share({ text: transcript });
        return;
      }
      await navigator.clipboard.writeText(transcript);
      setShared(true);
    } catch {
      // A dismissed share sheet and a refused clipboard both land here, and
      // neither is worth interrupting the reader over.
    }
  };

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className={cx("flex shrink-0 items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={share}
        disabled={disabled}
        aria-label={shared ? "Transcript copied" : "Share chat"}
        title={shared ? "Transcript copied" : "Share chat"}
        className={ACTION_BUTTON}
      >
        {shared ? (
          <RiCheckLine className="size-[18px] shrink-0" aria-hidden />
        ) : (
          <RiUploadLine className="size-[18px] shrink-0" aria-hidden />
        )}
      </button>

      <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownTrigger
          aria-label="More actions for this chat"
          isDisabled={disabled}
          className={cx(ACTION_BUTTON, menuOpen && "bg-background-primary-hover text-text-primary")}
        >
          <RiMoreFill className="size-[18px] shrink-0" aria-hidden />
        </DropdownTrigger>

        <DropdownPopover
          aria-label="More actions for this chat"
          placement="bottom end"
          className="w-[190px] p-2"
        >
          <DropdownGroup>
            <DropdownItem onSelect={choose(onExport)} className="px-2 py-1.5">
              <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
                Export chats
              </span>
            </DropdownItem>
            <DropdownItem onSelect={choose(onToggleUnread)} className="px-2 py-1.5">
              <span className="truncate text-body-medium whitespace-nowrap text-text-primary">
                Mark as unread
              </span>
            </DropdownItem>
            <DropdownItem onSelect={choose(onDelete)} className="px-2 py-1.5">
              <span className="truncate text-body-medium whitespace-nowrap text-text-error-primary">
                Delete chat
              </span>
            </DropdownItem>
          </DropdownGroup>
        </DropdownPopover>
      </Dropdown>
    </div>
  );
}

/** DropdownTrigger is itself a button, so both controls share plain classes
 *  rather than wrapping an IconButton (which would nest one button in another). */
const ACTION_BUTTON = cx(
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md",
  "text-foreground-icon-secondary transition-colors duration-150 ease",
  "hover:bg-background-primary-hover hover:text-foreground-icon-primary",
  "disabled:cursor-not-allowed disabled:opacity-40",
);
