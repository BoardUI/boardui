"use client";

import { RiCloseLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { Logo } from "@/components/foundations/brand/logo";
import { cx } from "@/utils/cx";

const DISMISSED_KEY = "boardui:pro-offer-dismissed";
const PRICING_URL = "https://www.boardui.com/#pricing";

/**
 * The one mention of Pro inside the starter: a small card in the corner, gone
 * for good once closed. Counts are the catalogue as of September 2026; update
 * them when Pro grows.
 */
export function ProOfferCard({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the dismissal after mount; there is no render-time source for it
      setOpen(!window.localStorage.getItem(DISMISSED_KEY));
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Without storage it simply comes back next visit.
    }
  };

  return (
    <aside
      aria-label="BoardUI Pro"
      className={cx(
        "fixed inset-x-3 bottom-3 z-40 flex w-auto flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card sm:inset-x-auto sm:right-3 sm:w-[280px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Logo size={40} />
        <IconButton icon={RiCloseLine} size="small" aria-label="Dismiss" onClick={dismiss} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-medium text-text-primary">Get lifetime access to Pro</p>
        <p className="text-body-2-regular text-text-secondary">
          8 full-page templates and 23 Pro components, 17 of them chart cards. One payment,
          updates for life, installed into this project as source.
        </p>
      </div>
      <ButtonLink href={PRICING_URL} target="_blank" rel="noreferrer" className="w-full">
        Get Pro
      </ButtonLink>
    </aside>
  );
}
