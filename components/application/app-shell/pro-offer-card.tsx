"use client";

import { useEffect, useState } from "react";

import { ProPromptCard } from "@/components/application/templates/pro-prompt-card";
import { ButtonLink } from "@/components/base/buttons/button";

const DISMISSED_KEY = "boardui:pro-offer-dismissed";
const PRICING_URL = "https://www.boardui.com/#pricing";

/**
 * The one mention of Pro inside the starter: the same card the Pro templates
 * show on boardui.com, with the starter's own words and a link to pricing in
 * place of the site's dialog. Gone for good once closed. Counts are the
 * catalogue as of September 2026; update them when Pro grows.
 */
export function ProOfferCard() {
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

  return (
    <ProPromptCard
      title="Get lifetime access to Pro"
      description="8 full-page templates and 23 Pro components, 17 of them chart cards. One payment, updates for life, installed into this project as source."
      cta={
        <ButtonLink href={PRICING_URL} target="_blank" rel="noreferrer" className="w-full">
          Get Pro
        </ButtonLink>
      }
      onDismiss={() => {
        setOpen(false);
        try {
          window.localStorage.setItem(DISMISSED_KEY, "1");
        } catch {
          // Without storage it simply comes back next visit.
        }
      }}
    />
  );
}
