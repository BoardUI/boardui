import type { HeroRaysConfig } from "@/components/application/landing/hero-rays/hero-rays-config";

/**
 * The Pro card's ray field, tuned for an 88px strip 280px wide (a different
 * picture from the 1060px hero band, so its own numbers). Shared by the site's
 * prompt and the starter's card, so both cards carry the same light. The site
 * tunes these through template-pro-rays-store; paste settled values here.
 */
export const TEMPLATE_PRO_RAYS: HeroRaysConfig = {
  count: 19,
  spread: 0.98,
  center: 0.5,
  width: 0.0535,
  widthVariance: 0.29,
  softness: 0.91,
  glow: 0.58,
  seed: 34,
  top: -0.6,
  length: 1.12,
  lengthVariance: 0.56,
  featherTop: 0.34,
  featherBottom: 0.55,
  shape: 1.52,
  taper: 1.9,
  edgeFade: 0.07,
  speed: 1.2,
  cycle: 5.9,
  duty: 0.69,
  fade: 0.425,
  stagger: 1,
  sway: 0.006,
  swaySpeed: 0.32,
  shimmer: 0.21,
  shimmerSpeed: 1.97,
  colorA: "#29a2ff",
  colorB: "#009dff",
  colorC: "#d85a5a",
  background: "#f7f7f7",
  backgroundDark: "#171717",
  backgroundAlpha: 0.92,
  intensity: 0.98,
  exposure: 1.15,
  ink: 0,
  grain: 0.085,
  grainDark: 0.046,
  height: 200,
};
