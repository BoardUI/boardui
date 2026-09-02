"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { ProLogoMark } from "@/components/application/landing/pro-logo-mark";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";

/**
 * The Pro card itself: the mark, two lines of copy, a full-width call to
 * action with a shimmer, and a close control, anchored bottom-left. The site
 * mounts it over Pro templates with the ray field and the pricing dialog; the
 * starter mounts the same card with a soft backdrop and a link to pricing.
 * Everything that differs comes in as props, so the two never drift.
 */
export function ProPromptCard({
  title,
  description,
  cta,
  onDismiss,
  backdrop,
  backdropHeight = 120,
  "aria-label": ariaLabel = "BoardUI Pro",
  dismissLabel = "Dismiss",
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  /** The button. Full width; the mark at the top already says Pro. */
  cta: ReactNode;
  onDismiss: () => void;
  /** Light across the top, masked out before it reaches the copy. */
  backdrop?: ReactNode;
  backdropHeight?: number;
  "aria-label"?: string;
  dismissLabel?: string;
  className?: string;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 1.2, ease: "easeOut" }}
      aria-label={ariaLabel}
      className={cx(
        "fixed inset-x-3 bottom-3 z-60 flex w-auto flex-col items-start gap-3 overflow-hidden rounded-2xl border border-border-button-white bg-background-secondary-default p-4 shadow-waitlist sm:inset-x-auto sm:left-3 sm:w-[280px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{
          height: backdropHeight,
          maskImage: "linear-gradient(to bottom, #000 38%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 38%, transparent 100%)",
        }}
      >
        {backdrop ?? (
          <div className="absolute inset-0 bg-linear-to-br from-accent-200 via-accent-100 to-transparent opacity-70" />
        )}
      </div>
      <ProLogoMark scale={40 / 56} animated className="relative shrink-0" />
      <div className="relative flex min-w-0 flex-col gap-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        <p className="text-body-2-regular text-text-secondary">{description}</p>
      </div>
      {/* The wrapper clips the shimmer to the button's own corners. */}
      <div className="relative w-full">
        {cta}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2lg"
        >
          <span className="bui-badge-shimmer absolute inset-y-0 -left-[55%] w-[45%] bg-linear-to-r from-transparent via-white/40 to-transparent" />
        </span>
      </div>
      <CloseButton
        size="xs"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="absolute top-3 right-3 z-10"
      />
    </motion.aside>
  );
}
