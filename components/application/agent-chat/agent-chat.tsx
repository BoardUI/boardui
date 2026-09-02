"use client";

import { useChat } from "@ai-sdk/react";
import { RiCloseLine, RiMenuLine } from "@remixicon/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentChatActions } from "@/components/application/agent-chat/agent-chat-actions";
import {
  AgentChatHistory,
  type ChatThreadSummary,
} from "@/components/application/agent-chat/agent-chat-history";
import { AgentMessage } from "@/components/application/agent-chat/agent-chat-message";
import { AgentComposer } from "@/components/application/agent-chat/agent-composer";
import { AgentThinking } from "@/components/application/agent-thinking/agent-thinking";
import { starterNav, useStarterBase } from "@/components/application/app-shell/app-shell";
import { DashboardSidebar } from "@/components/application/dashboard/dashboard-sidebar";
import { IconButton } from "@/components/base/buttons/icon-button";
import { cx } from "@/utils/cx";

/**
 * A working chat app, wired to the `/api/chat` runtime.
 *
 * Built only from free components — the free `sidebar`, AgentThinking,
 * ComposerLoader, IconButton — so the whole screen can ship in a public
 * starter repo without giving away anything sold as Pro. It follows the Pro AI
 * chat template's geometry (12px page frame, 16px gap, the 260px sidebar card,
 * a rounded-3xl chat surface) so a starter and a purchased template read as
 * the same product.
 *
 * Any later chat screen that streams from a model should read the same
 * message shape from the same endpoint, so it can replace this one without
 * touching the backend.
 */

const ENDPOINT = "/api/chat";
const STORAGE_KEY = "boardui:agent-chat-threads";
/** Enough history to be useful without letting localStorage grow unbounded. */
const MAX_THREADS = 30;

const SUGGESTIONS = [
  "Explain what this starter does",
  "Write a product update in three sentences",
  "Give me five names for a scheduling app",
];

interface StoredThread extends ChatThreadSummary {
  messages: UIMessage[];
  /** Message id -> when it arrived, so a restored chat shows real times
   *  rather than reporting every message as having just landed. */
  messageAt: Record<string, number>;
}

type Probe = {
  status: "checking" | "ready" | "unconfigured";
  provider: string | null;
  /** Display name from the runtime ("Anthropic"), so the UI needs no list of its own. */
  label: string | null;
  model: string | null;
};

export function AgentChat({
  className,
  contained = false,
}: {
  className?: string;
  /** Docs preview mode: fill the preview frame's height instead of the
   *  viewport, and keep the phone nav drawer inside the frame. */
  contained?: boolean;
}) {
  const [probe, setProbe] = useState<Probe>({ status: "checking", provider: null, label: null, model: null });
  const [input, setInput] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  // The sidebar links only to pages the starter has; see app-shell.
  const navItems = starterNav(useStarterBase());
  const [threads, setThreads] = useState<StoredThread[]>([]);
  // Empty until the mount effect assigns one: an id generated during render
  // would differ between server and client and break hydration.
  const [activeId, setActiveId] = useState("");
  /** Stamped on send, so render never calls Date.now(). */
  const [activeUpdatedAt, setActiveUpdatedAt] = useState(0);
  /** Set when the open thread is renamed. Without it the derived title
   *  (built from the first message) would immediately overwrite the name. */
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  /** When each message arrived, for the hover timestamp. */
  const [messageAt, setMessageAt] = useState<Record<string, number>>({});
  /** True once the transcript is scrolled at all. */
  const [scrolledUnder, setScrolledUnder] = useState(false);
  /** Whether the title and the message column actually overlap horizontally.
   *  On a wide screen the column is centred well clear of a short title, so
   *  text passing behind the header never touches it and a rule would be
   *  drawing a line under nothing. */
  const [canClash, setCanClash] = useState(false);
  /** Guards the writer: before the restore below runs, `threads` is empty,
   *  and persisting that would erase stored history on every page load. */
  const [restored, setRestored] = useState(false);

  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: ENDPOINT }),
  });

  const busy = status === "submitted" || status === "streaming";

  // Reasoning models stream their thinking before any text, and the SDK flips
  // status to "streaming" on that first non-text chunk. Gating the indicator on
  // "submitted" alone therefore hides it seconds before a word appears, leaving
  // an empty transcript. It stays up until real text exists.
  const streamedText = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return "";
    return last.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }, [messages]);
  const showThinking = busy && streamedText.length === 0;

  /** The open chat as plain text, for the share control. */
  const transcript = useMemo(
    () =>
      messages
        .map((message) => `${message.role === "user" ? "You" : "Assistant"}: ${messageText(message)}`)
        .filter((line) => !line.endsWith(": "))
        .join("\n\n"),
    [messages],
  );

  // Ask the runtime what it has before the first message, so a deployment with
  // no key renders setup steps instead of letting someone type into a dead box.
  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT, { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: boolean; provider?: string; providerLabel?: string; model?: string } | null) => {
        if (cancelled) return;
        // Only an explicit `configured: false` means "no key". A failed or
        // unreadable probe says nothing about the key, and treating it as
        // missing would hide the composer behind setup steps for a fault that
        // has nothing to do with configuration.
        setProbe({
          status: data && data.configured === false ? "unconfigured" : "ready",
          provider: data?.provider ?? null,
          label: data?.providerLabel ?? null,
          model: data?.model ?? null,
        });
      })
      .catch(() => {
        // A failed probe shouldn't lock the composer — let the send attempt
        // surface the real error rather than guessing the cause here.
        if (!cancelled) setProbe({ status: "ready", provider: null, label: null, model: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore history, then open on a fresh thread rather than reviving the last
  // one — landing mid-conversation after a reload is more surprising than
  // useful, and the rail is right there. localStorage cannot be read during
  // render (it does not exist while server-rendering), so this is the one
  // place state has to be set from an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(newThreadId());
    setThreads(orderThreads(readThreads()));
    setRestored(true);
  }, []);

  // The thread being typed into is derived rather than stored, so its title
  // appears as soon as the first message lands without a state round-trip.
  // The timestamp is stamped when a message is sent rather than read during
  // render, so rendering stays pure and the badge does not drift each frame.
  const liveThread: StoredThread | null = useMemo(
    () =>
      activeId && messages.length > 0
        ? {
            id: activeId,
            title: activeTitle ?? deriveTitle(messages),
            updatedAt: activeUpdatedAt,
            messages,
            messageAt,
          }
        : null,
    [activeId, messages, activeUpdatedAt, messageAt, activeTitle],
  );

  // Ordered by last message, never by what is open: selecting a thread must
  // not move it, or the list reshuffles under the pointer as you browse it.
  const allThreads = useMemo(() => {
    const rest = threads.filter((thread) => thread.id !== activeId);
    return orderThreads(liveThread ? [liveThread, ...rest] : rest);
  }, [liveThread, threads, activeId]);

  // Persist whenever the list settles. Held back during a stream so it is not
  // rewritten on every token, and until the restore above has run so an empty
  // first render cannot clobber stored history.
  useEffect(() => {
    if (!restored || busy) return;
    writeThreads(allThreads);
  }, [restored, busy, allThreads]);

  // Arrival times come from outside React (they are a property of when the
  // stream delivered each message), so they are recorded rather than derived.
  useEffect(() => {
    const unseen = messages.filter((message) => messageAt[message.id] === undefined);
    if (unseen.length === 0) return;
    const now = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessageAt((prev) => {
      const next = { ...prev };
      for (const message of unseen) next[message.id] = now;
      return next;
    });
  }, [messages, messageAt]);

  // Geometry, not a breakpoint: the title is as wide as its text, so whether
  // it reaches the column depends on both and has to be measured.
  useEffect(() => {
    const measure = () => {
      const title = titleRef.current?.getBoundingClientRect();
      const column = columnRef.current?.getBoundingClientRect();
      if (!title || !column) return;
      // A 16px buffer so text never slides right up against the title.
      setCanClash(title.right + 16 > column.left);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [messages.length, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setActiveUpdatedAt(Date.now());
    sendMessage({ text: trimmed });
    setInput("");
  };

  /** Folds the thread being left back into the stored list before switching.
   *  Its timestamp is carried over untouched, so leaving a thread never
   *  changes where it sits in the list. */
  const keepLiveThread = useCallback(() => {
    if (!liveThread) return;
    setThreads((prev) =>
      orderThreads([liveThread, ...prev.filter((thread) => thread.id !== liveThread.id)]),
    );
  }, [liveThread]);

  const startNewChat = useCallback(() => {
    if (busy) return;
    keepLiveThread();
    setActiveId(newThreadId());
    setActiveUpdatedAt(0);
    setActiveTitle(null);
    setMessageAt({});
    setMessages([]);
    setInput("");
  }, [busy, keepLiveThread, setMessages]);

  const renameThread = useCallback(
    (id: string, title: string) => {
      if (id === activeId) setActiveTitle(title);
      setThreads((prev) =>
        prev.map((thread) => (thread.id === id ? { ...thread, title } : thread)),
      );
    },
    [activeId],
  );

  const toggleUnread = useCallback((id: string) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === id ? { ...thread, unread: !thread.unread } : thread)),
    );
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      const remaining = threads.filter((thread) => thread.id !== id);
      setThreads(remaining);
      // Deleting the thread you are reading leaves nothing to read, so the
      // pane opens a fresh one rather than showing a transcript with no row.
      if (id === activeId) {
        setActiveId(newThreadId());
        setActiveUpdatedAt(0);
        setActiveTitle(null);
        setMessageAt({});
        setMessages([]);
        setInput("");
      }
    },
    [threads, activeId, setMessages],
  );

  /** Hands the stored chats back as a file. Nothing leaves the browser: the
   *  blob is built locally and revoked straight after the click. */
  const exportThreads = useCallback(() => {
    if (allThreads.length === 0) return;
    const blob = new Blob([JSON.stringify(allThreads, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "boardui-chats.json";
    // In the document because some browsers ignore click() on a detached
    // anchor, and revoked a tick later rather than immediately: revoking in the
    // same turn can kill the URL before the browser has read the blob, which
    // saves an empty file or nothing at all.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [allThreads]);

  const selectThread = useCallback(
    (id: string) => {
      if (busy || id === activeId) return;
      const thread = allThreads.find((candidate) => candidate.id === id);
      if (!thread) return;
      keepLiveThread();
      // Reading a chat is what marks it read again.
      if (thread.unread) toggleUnread(id);
      setActiveId(id);
      setActiveUpdatedAt(thread.updatedAt);
      setActiveTitle(thread.title);
      setMessageAt(thread.messageAt ?? {});
      setMessages(thread.messages);
      setInput("");
    },
    [busy, activeId, allThreads, keepLiveThread, toggleUnread, setMessages],
  );

  return (
    <div
      className={cx(
        "relative flex w-full gap-4 overflow-hidden bg-background-full p-3",
        contained ? "h-[var(--template-preview-height)]" : "h-dvh",
        className,
      )}
    >
      <DashboardSidebar items={navItems} selected="chat" className="hidden lg:flex" />

      {/* Below lg the sidebar rides in as an overlay drawer. The Pro template
          pushes the workspace across instead; this is the plain version. */}
      {navOpen && (
        <div className={cx(contained ? "absolute" : "fixed", "inset-0 z-50 flex lg:hidden")}>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/40"
          />
          <div className="relative flex h-full p-3">
            <DashboardSidebar
              mobile
              items={navItems}
              selected="chat"
              onClose={() => setNavOpen(false)}
              className="flex"
            />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
        <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-secondary-default">
            <header
              className={cx(
                "absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-2 border-b px-4 pt-[7px] transition-colors",
                // Overlaid rather than stacked above the transcript. Stacked,
                // the scroll area began below it and text was cut off at the
                // header's edge; overlaid, it runs to the container's own
                // rounded top and is clipped by that instead.
                // A rule only earns its place when the text both passes under
                // the header AND the title is wide enough to be in its way.
                // The border is always present but transparent, so appearing
                // costs no height and nothing shifts.
                // When it does clash the band frosts over, so the text passing
                // behind it is obscured instead of running through the title.
                // Tied to the same condition as the rule: with no clash the
                // header stays fully transparent and the transcript reads all
                // the way up to the card's edge.
                scrolledUnder && canClash
                  ? "border-separator-border bg-white/20 backdrop-blur-[20px] dark:bg-black/20"
                  : "border-transparent",
              )}
            >
              <IconButton
                icon={navOpen ? RiCloseLine : RiMenuLine}
                size="small"
                aria-label="Open navigation"
                onClick={() => setNavOpen((open) => !open)}
                className="lg:hidden"
              />
              <span
                ref={titleRef}
                className="min-w-0 shrink truncate text-headline-medium text-text-primary"
              >
                {headerTitle(allThreads, activeId)}
              </span>

              <AgentChatActions
                className="ml-auto"
                transcript={transcript}
                onExport={exportThreads}
                onToggleUnread={() => toggleUnread(activeId)}
                onDelete={() => deleteThread(activeId)}
                disabled={messages.length === 0}
              />
            </header>

            {probe.status === "unconfigured" && messages.length === 0 ? (
              <SetupNotice />
            ) : (
              <>
                <div
                  ref={scrollRef}
                  onScroll={(event) => setScrolledUnder(event.currentTarget.scrollTop > 0)}
                  className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
                >
                  <div
                    ref={columnRef}
                    className={cx(
                      "mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-[72px] pb-6",
                      // With nothing to read, the prompt sits in the middle of
                      // the empty space rather than pinned under the header.
                      messages.length === 0 && "min-h-full justify-center",
                    )}
                  >
                    {messages.length === 0 ? (
                      <EmptyState onPick={submit} />
                    ) : (
                      messages.map((message, index) => (
                        <AgentMessage
                          key={message.id}
                          role={message.role}
                          text={messageText(message)}
                          streaming={busy && index === messages.length - 1}
                          at={messageAt[message.id]}
                        />
                      ))
                    )}

                    {showThinking && (
                      <AgentThinking variant="wave" label="Thinking" className="px-1" />
                    )}

                    {error && (
                      <p role="alert" className="px-1 text-body-regular text-text-tertiary">
                        Something went wrong. Check the server logs, then try again.
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 px-3 pb-3">
                  <div className="mx-auto w-full max-w-3xl">
                    <AgentComposer
                      value={input}
                      onValueChange={setInput}
                      onSubmit={() => submit(input)}
                      onStop={stop}
                      busy={busy}
                      model={probe.model}
                      provider={probe.label ?? probe.provider}
                      messageCount={messages.length}
                    />
                  </div>
                </div>
              </>
            )}
        </div>

        {(probe.status !== "unconfigured" || messages.length > 0) && (
            <AgentChatHistory
              threads={allThreads}
              activeId={activeId}
              onSelect={selectThread}
              onNewChat={startNewChat}
              onRename={renameThread}
              onToggleUnread={toggleUnread}
              onDelete={deleteThread}
              onExport={exportThreads}
            disabled={busy}
            className="hidden xl:flex"
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-2-medium text-text-primary">What can I help with?</h2>
        <p className="text-body-regular text-text-secondary">
          This chat runs against your own API key. History stays in this browser.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="cursor-pointer rounded-full bg-background-primary-default px-3.5 py-2 text-body-regular text-text-secondary shadow-xs transition-colors hover:bg-background-primary-hover"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Shown when the runtime reports no provider key. Deliberately specific about
 * where the key goes, because the person seeing this has usually just clicked
 * Deploy and has no context for where that setting lives.
 */
function SetupNotice() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-3 rounded-2xl bg-background-primary-default p-6 shadow-card">
        <h2 className="text-headline-medium text-text-primary">Add an API key to start</h2>
        <p className="text-body-regular text-text-secondary">
          The chat is wired up and ready. It needs a model provider key before it can answer.
        </p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-body-regular text-text-secondary">
          <li>Open your project on Vercel, then Settings, then Environment Variables.</li>
          <li>
            Add <code className="text-text-primary">AI_API_KEY</code> with a key from OpenAI,
            Anthropic, Google, OpenRouter, or Vercel AI Gateway.
          </li>
          <li>Redeploy.</li>
        </ol>
        <p className="text-caption-1-regular text-text-tertiary">
          Running locally? Put the same variable in <code>.env.local</code> and restart the dev
          server.
        </p>
      </div>
    </div>
  );
}

/** Newest message first, and trimmed from the oldest end. */
function orderThreads(threads: StoredThread[]) {
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_THREADS);
}

/** The text parts of a message, joined. Reasoning and tool parts ride the
 *  same array and are ignored here; a richer screen would render them. */
function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function newThreadId() {
  // randomUUID needs a secure context; a deployed starter always has one, but
  // plain-http previews and older browsers do not.
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deriveTitle(messages: UIMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}...` : text;
}

function headerTitle(threads: ChatThreadSummary[], activeId: string) {
  return threads.find((thread) => thread.id === activeId)?.title ?? "New chat";
}

/** Storage is a convenience, never a source of truth — every access can throw
 *  (private browsing, disabled site data) and must not take the chat with it. */
function readThreads(): StoredThread[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (thread): thread is StoredThread =>
        typeof thread === "object" &&
        thread !== null &&
        typeof (thread as StoredThread).id === "string" &&
        Array.isArray((thread as StoredThread).messages),
    );
  } catch {
    return [];
  }
}

function writeThreads(threads: StoredThread[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // Quota or blocked storage: history is best-effort, the chat still works.
  }
}
