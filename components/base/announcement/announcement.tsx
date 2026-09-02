"use client";

import type { ComponentType, HTMLAttributes, ReactNode, Ref } from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RiShieldStarFill } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx, sortCx } from "@/utils/cx";

/**
 * Figma source: Board UI → "Event card" (node 3718:2317).
 *
 * A compact announcement / onboarding card sized for the sidebar (fills its
 * container — 236px inside the 260px sidebar). Structure, 1:1 with Figma:
 *
 *   card            flex-col, gap 12, p 12, radius 12, border, white, no shadow
 *   ├─ content      flex-col, gap 4
 *   │  ├─ icon      shield-star-fill, 20×20 (RiShieldStarFill)
 *   │  ├─ close     CloseButton size="xs" (absolute, top-right)
 *   │  └─ text      flex-col, gap 2
 *   │     ├─ title  Body 1/Medium (14/20), text/primary
 *   │     └─ desc   Body 2/Medium (13/18), text/secondary
 *   └─ action       Button secondary / small, full width
 *
 * Height math: 12 + 20 + 4 + (20 + 2 + 36) + 12 + 32 + 12 = 150 (matches frame).
 *
 * Everything after the title is optional:
 *   - `description` omitted → text block is title-only.
 *   - `actionLabel` omitted → no CTA button.
 *   - `dismissible` false → no close button.
 *
 * Dismissal is self-managed: clicking the close button plays a soft blur +
 * scale-down (0.85) exit via `motion/react`, then unmounts and fires the
 * optional `onClose` callback. The leading `icon` defaults to the shield used
 * in the frame; pass any Remix Icon component reference (`RiSparklingFill`,
 * not `<RiSparklingFill />`).
 *
 * `introDelay` opts into a matching entrance: blur + fade + scale up from
 * 0.85, rising 15px up from below into place, after the given delay (seconds).
 * Off by default (card just appears) — set it for placements where the
 * banner should call attention after the surrounding UI has settled, e.g. the
 * sidebar slot in `DashboardSidebar`.
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface AnnouncementProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "title" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
  > {
  title: ReactNode;
  description?: ReactNode;
  /** Leading icon. Defaults to the shield-star from the Figma frame. */
  icon?: IconComponent;
  /** CTA label. When set, a full-width secondary button is rendered. */
  actionLabel?: ReactNode;
  onAction?: () => void;
  /** Show a dismiss button in the top-right corner. */
  dismissible?: boolean;
  /** Called once the dismiss exit animation finishes. */
  onClose?: () => void;
  /** Accessible name for the dismiss button. */
  closeLabel?: string;
  /**
   * Seconds to wait before playing the blur/fade/scale-up entrance. Omit to
   * skip the entrance entirely (card just appears).
   */
  introDelay?: number;
  ref?: Ref<HTMLDivElement>;
}

const styles = sortCx({
  card: [
    "relative flex w-full flex-col items-start gap-3 p-3",
    "rounded-xl border border-border-button-default bg-background-primary-default",
  ].join(" "),
  content: "flex w-full flex-col items-start gap-1",
  icon: "size-5 shrink-0 text-foreground-icon-secondary",
  close: "absolute right-3 top-3",
  text: "flex w-full flex-col items-start gap-0.5",
  title: "w-full text-body-medium text-text-primary",
  description: "w-full text-body-2-medium text-text-secondary",
});

export function Announcement({
  title,
  description,
  icon: Icon = RiShieldStarFill,
  actionLabel,
  onAction,
  dismissible = false,
  onClose,
  closeLabel = "Dismiss",
  introDelay,
  className,
  ref,
  ...props
}: AnnouncementProps) {
  const [dismissed, setDismissed] = useState(false);
  const hasIntro = introDelay !== undefined;

  return (
    <AnimatePresence onExitComplete={onClose}>
      {!dismissed && (
        <motion.div
          ref={ref}
          initial={hasIntro ? { opacity: 0, y: 15, scale: 0.85, filter: "blur(6px)" } : false}
          animate={
            hasIntro
              ? {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.25, ease: "easeOut", delay: introDelay },
                }
              : undefined
          }
          exit={{
            opacity: 0,
            scale: 0.85,
            filter: "blur(6px)",
            transition: { duration: 0.25, ease: "easeInOut" },
          }}
          className={cx(styles.card, className)}
          {...props}
        >
          <div className={styles.content}>
            <Icon className={styles.icon} aria-hidden />

            {dismissible ? (
              <CloseButton
                size="xs"
                aria-label={closeLabel}
                onClick={() => setDismissed(true)}
                className={styles.close}
              />
            ) : null}

            <div className={styles.text}>
              <p className={styles.title}>{title}</p>
              {description ? <p className={styles.description}>{description}</p> : null}
            </div>
          </div>

          {actionLabel ? (
            <Button
              variant="secondary"
              size="small"
              onClick={onAction}
              className="w-full"
            >
              {actionLabel}
            </Button>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
