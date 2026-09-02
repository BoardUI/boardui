"use client";

import { useEffect, useState } from "react";

import { HeroRays } from "@/components/application/landing/hero-rays/hero-rays";
import { ProPromptCard } from "@/components/application/templates/pro-prompt-card";
import { TEMPLATE_PRO_RAYS } from "@/components/application/templates/pro-prompt-rays";
import { useThemeMode } from "@/components/application/theme/theme-toggle";
import { ButtonLink } from "@/components/base/buttons/button";

const DISMISSED_KEY = "boardui:pro-offer-dismissed";
const PRICING_URL = "https://www.boardui.com/#pricing";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The one mention of Pro inside the starter: the same card the Pro templates
 * show on boardui.com, ray field included, with the starter's own words and a
 * link to pricing in place of the site's dialog. Gone for good once closed.
 * Counts are the catalogue as of September 2026; update them when Pro grows.
 */
export function ProOfferCard() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const theme = useThemeMode();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the dismissal and the motion preference after mount; neither has a render-time source
      setOpen(!window.localStorage.getItem(DISMISSED_KEY));
    } catch {
      setOpen(true);
    }
    setReduceMotion(window.matchMedia(REDUCED_MOTION_QUERY).matches);
  }, []);

  if (!open) return null;

  const rays =
    theme === "dark"
      ? {
          ...TEMPLATE_PRO_RAYS,
          background: TEMPLATE_PRO_RAYS.backgroundDark,
          grain: TEMPLATE_PRO_RAYS.grainDark,
        }
      : TEMPLATE_PRO_RAYS;

  return (
    <ProPromptCard
      title="Get lifetime access to Pro"
      description="8 full-page templates and 23 Pro components, 17 of them chart cards. One payment, updates for life, installed into this project as source."
      backdropHeight={TEMPLATE_PRO_RAYS.height}
      backdrop={
        <HeroRays config={rays} paused={reduceMotion} className="absolute inset-0 size-full" />
      }
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
