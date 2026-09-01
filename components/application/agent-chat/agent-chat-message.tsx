"use client";

import { RiCheckLine, RiFileCopyLine, RiVolumeMuteLine, RiVolumeUpLine } from "@remixicon/react";
import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";

import { cx } from "@/utils/cx";

/**
 * One turn in the transcript.
 *
 * Assistant replies arrive a paragraph at a time, each softening in out of a
 * blur as it first appears and then only growing, so nothing already on screen
 * ever re-animates.
 *
 * The action row is deliberately mounted at all times and revealed on hover or
 * focus. Rendering it only on hover would make it unreachable by keyboard and
 * would shift the layout as the pointer moves across the transcript.
 */

export interface AgentMessageProps {
  role: string;
  text: string;
  /** True while this message is still being streamed. */
  streaming?: boolean;
  /** When the message first appeared, for the hover timestamp. */
  at?: number;
}

export function AgentMessage({ role, text, streaming = false, at }: AgentMessageProps) {
  if (!text) return null;

  if (role === "user") {
    return (
      <p className="ml-auto flex w-fit max-w-[75%] flex-col rounded-2xl bg-background-primary-default px-3 py-[11px] text-left text-body-regular break-words whitespace-pre-wrap text-text-primary shadow-card">
        {text}
      </p>
    );
  }

  return (
    <div className="group/message flex flex-col gap-1 px-1">
      <StreamedText text={text} />
      <MessageActions text={text} at={at} hidden={streaming} />
    </div>
  );
}

/**
 * Paragraphs, each softening in once as it first appears.
 *
 * The animation deliberately lives at the line level rather than the word
 * level. Animating words looks worse in practice: a token arrives as a
 * fragment, the blur-in plays on that fragment, and then the fragment mutates
 * to the finished word with no transition — which reads as a stutter. It also
 * forces a swap from animated spans back to plain text when the stream ends,
 * and everything mid-flight snaps at once.
 *
 * A line mounts exactly once and then only grows, so nothing ever restarts or
 * snaps. Evenness of the text itself comes from the server, which releases
 * whole words on a steady tick (see `smoothStream` in the route).
 */
function StreamedText({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();
  const lines = useMemo(() => text.split("\n").filter((line) => line.trim() !== ""), [text]);

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, index) => (
        <Line key={index} text={line} animate={!reduceMotion} />
      ))}
    </div>
  );
}

/**
 * At module scope so their identity is stable. A line re-renders on every
 * token of the reply — dozens of times a second — and handing Motion a fresh
 * object literal each time invites it to re-evaluate a target that has not
 * actually changed.
 */
const LINE_HIDDEN = { opacity: 0, filter: "blur(5px)", y: 4 };
const LINE_SHOWN = { opacity: 1, filter: "blur(0px)", y: 0 };
const LINE_TRANSITION = { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] } as const;

/**
 * A settled line keeps `filter: blur(0px)` rather than losing the filter
 * altogether — Motion owns that property once it animates it, and a `style`
 * override does not win it back. At one filtered element per paragraph the
 * cost is invisible; it was only a problem when every word carried its own.
 *
 * memo matters here: without it every paragraph re-renders on each token of
 * the reply, which is wasted work for the lines that are already finished.
 */
const Line = memo(function Line({ text, animate }: { text: string; animate: boolean }) {
  return (
    <motion.p
      initial={animate ? LINE_HIDDEN : false}
      animate={LINE_SHOWN}
      transition={LINE_TRANSITION}
      className="text-body-regular break-words text-text-primary"
    >
      {text}
    </motion.p>
  );
});

function MessageActions({ text, at, hidden }: { text: string; at?: number; hidden: boolean }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  // Speech keeps running if the component goes away mid-sentence, so it is
  // cancelled on unmount rather than left talking over the next screen.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // Silently leaving the icon unchanged is better than a thrown error.
    }
  };

  const toggleSpeech = () => {
    const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div
      className={cx(
        "flex items-center gap-1 transition-opacity duration-150",
        // Revealed on hover, and whenever a control inside has keyboard focus.
        hidden
          ? "pointer-events-none opacity-0"
          : "opacity-0 group-hover/message:opacity-100 focus-within:opacity-100",
      )}
    >
      <ActionButton label={copied ? "Copied" : "Copy message"} onClick={copy}>
        {copied ? <RiCheckLine className="size-4" aria-hidden /> : <RiFileCopyLine className="size-4" aria-hidden />}
      </ActionButton>

      <ActionButton label={speaking ? "Stop reading aloud" : "Read aloud"} onClick={toggleSpeech}>
        {speaking ? (
          <RiVolumeMuteLine className="size-4" aria-hidden />
        ) : (
          <RiVolumeUpLine className="size-4" aria-hidden />
        )}
      </ActionButton>

      {at ? (
        <time dateTime={new Date(at).toISOString()} className="ml-1 text-caption-1-regular text-text-tertiary">
          {formatAgo(at)}
        </time>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground-icon-tertiary transition-colors hover:bg-background-primary-default hover:text-foreground-icon-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

/** "just now", "3 minutes ago", "2 hours ago" — matching how the rail reads. */
function formatAgo(at: number) {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
