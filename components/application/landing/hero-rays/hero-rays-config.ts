import type { TuningGroup } from "@/components/application/landing/tuning/tuning-types";

/**
 * Every knob of the hero ray shader, in one place.
 *
 * This object is the single source of truth: `hero-rays.tsx` turns each key
 * into a uniform (`count` → `uCount`, `colorA` → `uColorA`), and
 * `hero-rays-panel.tsx` renders a control for it from `HERO_RAYS_CONTROLS`.
 * Adding a knob is three lines — a field here, a control entry below, and a
 * `uniform` declaration in the fragment shader.
 *
 * Distances are fractions of the canvas: x runs 0 (left) → 1 (right), y runs
 * 0 (top) → 1 (bottom). So `width: 0.02` is a beam 2% of the canvas wide, and
 * `length: 0.9` is a beam that runs 90% of the way down.
 */

export type HeroRaysConfig = {
  // Rays
  count: number;
  spread: number;
  center: number;
  width: number;
  widthVariance: number;
  softness: number;
  glow: number;
  seed: number;

  // Shape
  top: number;
  length: number;
  lengthVariance: number;
  featherTop: number;
  featherBottom: number;
  shape: number;
  taper: number;
  edgeFade: number;

  // Motion
  speed: number;
  cycle: number;
  duty: number;
  fade: number;
  stagger: number;
  sway: number;
  swaySpeed: number;
  shimmer: number;
  shimmerSpeed: number;

  // Color & output
  colorA: string;
  colorB: string;
  colorC: string;
  background: string;
  /** Swapped in for `background` under the dark theme. */
  backgroundDark: string;
  backgroundAlpha: number;
  intensity: number;
  exposure: number;
  /** 0 = beams add light, 1 = beams paint their own colour over the background. */
  ink: number;
  grain: number;
  /** Swapped in for `grain` under the dark theme. */
  grainDark: number;

  // Composition (CSS, not the shader — but tuned in the same sitting)
  height: number;
};

export const HERO_RAYS_DEFAULTS: HeroRaysConfig = {
  count: 17,
  spread: 0.68,
  center: 0.5,
  width: 0.0095,
  widthVariance: 0.33,
  softness: 0.91,
  glow: 0.26,
  seed: 34,

  top: -0.49,
  length: 0.92,
  lengthVariance: 0.56,
  featherTop: 0.34,
  featherBottom: 0.55,
  shape: 1.52,
  taper: 1.9,
  edgeFade: 0.07,

  speed: 1.81,
  cycle: 5.9,
  duty: 0.62,
  fade: 0.315,
  stagger: 1,
  sway: 0.006,
  swaySpeed: 0.35,
  shimmer: 0.77,
  shimmerSpeed: 0.42,

  colorA: "#4f8bff",
  colorB: "#5cecff",
  colorC: "#ff5c8d",
  background: "#ffffff",
  // Matches `--color-background-full` in dark mode, so the band's hard bottom
  // edge is invisible against the page. If that token ever moves, this needs
  // to move with it.
  backgroundDark: "#121212",
  backgroundAlpha: 0.92,
  intensity: 1.35,
  exposure: 1.15,
  ink: 0,
  grain: 0.085,
  // Dark needs less: the same dither that hides banding on a white band reads
  // as visible noise once the background drops to near-black.
  grainDark: 0.046,

  height: 1060,
};

export const HERO_RAYS_PRESETS: Record<string, HeroRaysConfig> = {
  Default: HERO_RAYS_DEFAULTS,

  // Brushed silver, the Pro badge's palette. Only possible with `ink` up:
  // additively these greys are dimmer than the background and vanish.
  Silver: {
    ...HERO_RAYS_DEFAULTS,
    count: 22,
    spread: 1.1,
    width: 0.012,
    widthVariance: 0.7,
    softness: 0.8,
    glow: 0.12,
    shimmer: 0.9,
    shimmerSpeed: 0.6,
    colorA: "#b9bcc4",
    colorB: "#8d919b",
    colorC: "#e8eaee",
    ink: 0.88,
    intensity: 1,
    exposure: 1,
  },

  // Wide, slow, mostly white — the closest to the Netflix title card.
  Netflix: {
    ...HERO_RAYS_DEFAULTS,
    count: 34,
    spread: 1.4,
    width: 0.007,
    widthVariance: 0.9,
    softness: 1.1,
    glow: 0.1,
    top: -0.15,
    length: 1.1,
    lengthVariance: 0.55,
    featherTop: 0.05,
    featherBottom: 0.7,
    shape: 1.5,
    taper: 2.6,
    cycle: 6,
    duty: 0.5,
    fade: 0.45,
    colorA: "#e2302c",
    colorB: "#ff9f9c",
    colorC: "#ffffff",
    background: "#07070a",
    backgroundAlpha: 1,
    intensity: 1.8,
    exposure: 1.3,
    shimmer: 0.05,
  },

  // Fewer, fatter, cooler beams — reads as atmosphere rather than as rays.
  Aurora: {
    ...HERO_RAYS_DEFAULTS,
    count: 12,
    spread: 1.5,
    width: 0.075,
    widthVariance: 0.6,
    softness: 0.12,
    glow: 0.35,
    length: 1.2,
    featherTop: 0.35,
    featherBottom: 0.6,
    shape: 0.9,
    taper: 1.2,
    cycle: 11,
    duty: 0.8,
    fade: 0.5,
    sway: 0.03,
    swaySpeed: 0.35,
    colorA: "#1e6bff",
    colorB: "#59f2d6",
    colorC: "#9a6bff",
    background: "#03060e",
    backgroundAlpha: 1,
    intensity: 0.85,
    exposure: 1.4,
    shimmer: 0.25,
  },

  // Sparse hairlines on near-black; quiet enough to put dense copy over.
  Minimal: {
    ...HERO_RAYS_DEFAULTS,
    count: 14,
    spread: 1.1,
    width: 0.0035,
    widthVariance: 0.5,
    softness: 1.6,
    glow: 0.06,
    length: 0.75,
    featherBottom: 0.65,
    taper: 1.2,
    cycle: 9,
    duty: 0.45,
    colorA: "#7aa2ff",
    colorB: "#ffffff",
    colorC: "#c8d8ff",
    background: "#08080b",
    backgroundAlpha: 1,
    intensity: 1.1,
    exposure: 1,
    shimmer: 0,
  },
};

export const HERO_RAYS_CONTROLS: TuningGroup[] = [
  {
    title: "Rays",
    controls: [
      { key: "count", label: "Count", type: "range", min: 1, max: 64, step: 1, hint: "How many beams exist at once (capped at 64 by the shader loop)." },
      { key: "spread", label: "Spread", type: "range", min: 0, max: 2, step: 0.01, hint: "How wide the band of beams is. 1 = exactly the canvas width." },
      { key: "center", label: "Center", type: "range", min: -0.5, max: 1.5, step: 0.01, hint: "Horizontal midpoint of the band." },
      { key: "width", label: "Width", type: "range", min: 0.001, max: 0.15, step: 0.0005, hint: "Base beam width, as a fraction of canvas width." },
      { key: "widthVariance", label: "Width variance", type: "range", min: 0, max: 1, step: 0.01, hint: "How much individual beams deviate from that base width." },
      { key: "softness", label: "Edge softness", type: "range", min: 0.02, max: 3, step: 0.01, hint: "Higher = crisper edges; lower = a diffuse smear." },
      { key: "glow", label: "Glow", type: "range", min: 0, max: 1.5, step: 0.005, hint: "Wide halo bleeding out either side of each beam." },
      { key: "seed", label: "Seed", type: "range", min: 0, max: 100, step: 1, hint: "Reshuffles positions, widths and phases." },
    ],
  },
  {
    title: "Shape",
    controls: [
      { key: "top", label: "Start", type: "range", min: -0.6, max: 1, step: 0.01, hint: "Where beams begin. 0 = top edge; negative starts off-canvas." },
      { key: "length", label: "Length", type: "range", min: 0.05, max: 2, step: 0.01, hint: "How far down a full-length beam runs." },
      { key: "lengthVariance", label: "Length variance", type: "range", min: 0, max: 1, step: 0.01, hint: "How much shorter the shortest beams get." },
      { key: "featherTop", label: "Feather top", type: "range", min: 0, max: 1, step: 0.01, hint: "Fade-in over the head of the beam." },
      { key: "featherBottom", label: "Feather bottom", type: "range", min: 0, max: 1, step: 0.01, hint: "Fade-out over the tail of the beam." },
      { key: "shape", label: "Falloff curve", type: "range", min: 0.2, max: 4, step: 0.01, hint: "Bends the head-to-tail brightness ramp." },
      { key: "taper", label: "Taper", type: "range", min: 0.2, max: 5, step: 0.01, hint: "Width at the tail relative to the head. >1 splays outward." },
      { key: "edgeFade", label: "Edge fade", type: "range", min: 0, max: 0.5, step: 0.005, hint: "Fades beams out near the left and right canvas edges." },
    ],
  },
  {
    title: "Motion",
    controls: [
      { key: "speed", label: "Speed", type: "range", min: 0, max: 4, step: 0.01, hint: "Global time multiplier. 0 freezes the frame." },
      { key: "cycle", label: "Cycle (s)", type: "range", min: 0.5, max: 20, step: 0.1, hint: "Seconds for one beam to appear, hold and vanish." },
      { key: "duty", label: "Duty", type: "range", min: 0.05, max: 1, step: 0.01, hint: "Share of the cycle a beam is lit at all — the rest is darkness." },
      { key: "fade", label: "Fade", type: "range", min: 0.01, max: 0.5, step: 0.005, hint: "Share of the lit time spent fading in and out. 0.5 = pure pulse." },
      { key: "stagger", label: "Stagger", type: "range", min: 0, max: 1, step: 0.01, hint: "How far apart beam phases sit. 0 makes them all blink together." },
      { key: "sway", label: "Sway", type: "range", min: 0, max: 0.15, step: 0.001, hint: "Horizontal drift amplitude." },
      { key: "swaySpeed", label: "Sway speed", type: "range", min: 0, max: 2, step: 0.01, hint: "How quickly beams drift back and forth." },
      { key: "shimmer", label: "Shimmer", type: "range", min: 0, max: 1, step: 0.01, hint: "Travelling brightness ripple along each beam." },
      { key: "shimmerSpeed", label: "Shimmer speed", type: "range", min: 0, max: 4, step: 0.01, hint: "How fast that ripple travels." },
    ],
  },
  {
    title: "Color & output",
    controls: [
      { key: "colorA", label: "Color A", type: "color", hint: "Beams pick a color across the A → B → C ramp." },
      { key: "colorB", label: "Color B", type: "color", hint: "Middle of the ramp." },
      { key: "colorC", label: "Color C", type: "color", hint: "End of the ramp." },
      { key: "background", label: "Background", type: "color", hint: "Tint painted behind the beams, in light mode." },
      { key: "backgroundDark", label: "Background (dark)", type: "color", hint: "Used instead under the dark theme — keep it equal to the page body so the band's bottom edge stays invisible." },
      { key: "backgroundAlpha", label: "Background alpha", type: "range", min: 0, max: 1, step: 0.01, hint: "0 lets the page background show through completely." },
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 4, step: 0.01, hint: "Overall brightness before tone mapping." },
      { key: "exposure", label: "Exposure", type: "range", min: 0.1, max: 4, step: 0.01, hint: "Tone-map exposure. High values blow highlights to white." },
      { key: "ink", label: "Ink", type: "range", min: 0, max: 1, step: 0.01, hint: "0 adds light, so only colours brighter than the background show. 1 paints the beam colour over the background instead, which is what makes grey, black and silver visible." },
      { key: "grain", label: "Grain", type: "range", min: 0, max: 0.15, step: 0.001, hint: "Dither that hides banding in the soft gradients, in light mode." },
      { key: "grainDark", label: "Grain (dark)", type: "range", min: 0, max: 0.15, step: 0.001, hint: "Used instead under the dark theme — a dark band shows the same dither far more readily." },
    ],
  },
  {
    title: "Composition",
    controls: [
      { key: "height", label: "Height (px)", type: "range", min: 200, max: 1400, step: 10, hint: "How tall the band is on large screens. It ends on a hard edge — there is no fade." },
    ],
  },
];

export const HERO_RAYS_COLOR_KEYS = ["colorA", "colorB", "colorC", "background"] as const;

/**
 * Keys the shader consumes as uniforms — everything except the CSS-only
 * composition knobs and `speed`, which scales the clock in JS rather than
 * reaching the GPU.
 */
// `backgroundDark` is resolved into `background` before upload, so the shader
// itself never sees a second background uniform.
const NON_UNIFORM_KEYS: ReadonlyArray<keyof HeroRaysConfig> = [
  "height",
  "speed",
  "backgroundDark",
  "grainDark",
];

export const HERO_RAYS_UNIFORM_KEYS = HERO_RAYS_CONTROLS.flatMap((group) =>
  // The control schema is shared with the glass panel, so its keys are plain
  // strings; every one of them is a config field by construction.
  group.controls.map((control) => control.key as keyof HeroRaysConfig),
).filter((key) => !NON_UNIFORM_KEYS.includes(key));
