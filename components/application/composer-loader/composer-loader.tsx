"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

/**
 * Composer Loader — a loading state that wraps a chat composer while the agent
 * works: an iridescent light band orbiting the pill's rim with a soft bloom
 * bleeding inward.
 *
 * The band is dash segments on an SVG stroke of the pill shape
 * (pathLength-normalized, so it travels at constant speed and bends around
 * the end caps), drawn at three scales — crisp line, tight glow, wide bloom —
 * with the sharp line leading and every soft layer's head pulled back behind
 * the tip.
 *
 * The component paints the pill surface itself and layers the light above
 * it, so the wrapped composer must not paint its own background:
 *
 *   <ComposerLoader active={isWaitingForReply}>
 *     <Composer className="bg-transparent shadow-none" />
 *   </ComposerLoader>
 *
 * `active` fades the whole effect in and out (450ms), so toggling it on
 * send / reply reads as the composer lighting up rather than snapping.
 */

export interface ComposerLoaderProps {
  children: ReactNode;
  /** Show the light. Fades in/out — flip it while awaiting a response. */
  active?: boolean;
  /** Four gradient colors, spread across the pill left → right. */
  colors?: [string, string, string, string];
  /** Seconds per full lap. */
  speed?: number;
  /** Overall light opacity. */
  intensity?: number;
  /** How far the bloom bleeds inward from the rim, px. */
  bloom?: number;
  /** Bloom layer opacity. */
  bloomStrength?: number;
  /** How much of the perimeter the band occupies, degrees (of 360). */
  arc?: number;
  /** Reverse the travel direction. */
  reverse?: boolean;
  /** Corner radius, px. Defaults to a full pill. */
  radius?: number;
  /** Paint the pill surface behind the light (on by default). */
  surface?: boolean;
  className?: string;
}

const DEFAULT_COLORS: [string, string, string, string] = [
  "#5eead4",
  "#46baec",
  "#e633a4",
  "#00faa7",
];

function hexTriplet(hex: string) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function ComposerLoader({
  children,
  active = true,
  colors = DEFAULT_COLORS,
  speed = 4.5,
  intensity = 0.7,
  bloom = 16,
  bloomStrength = 0.3,
  arc = 120,
  reverse = false,
  radius,
  surface = true,
  className,
}: ComposerLoaderProps) {
  const gradientId = `bui-cl-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const clipRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ w: 640, h: 52 });

  useEffect(() => {
    const el = clipRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setBox({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [c0, c1, c2, c3] = colors;
  // Gradient center: pure blend of the middle colors, so the band never
  // washes out to white.
  const mid = `rgb(${hexTriplet(c1)
    .map((v, i) => Math.round((v + hexTriplet(c2)[i]) / 2))
    .join(",")})`;

  const band = (arc / 360) * 100;
  const rx = radius ?? box.h / 2;
  const cornerRadius = radius ?? 9999;
  const direction = reverse ? "reverse" : "normal";

  // Path units per px, for pulling each soft layer's head behind the tip.
  // Rounded-rect perimeter: straight runs plus the four corner arcs (for the
  // default pill, rx = h/2 and this reduces to 2(w−h) + πh).
  const cornerR = Math.min(rx, box.w / 2, box.h / 2);
  const perimeter = Math.max(1, 2 * (box.w + box.h) - 8 * cornerR + 2 * Math.PI * cornerR);
  const pxUnits = (px: number) => (px * 100) / perimeter;
  const dashPhase = (len: number, backPx: number) =>
    reverse ? pxUnits(backPx) : len - band + pxUnits(backPx);

  const stroke = (width: number, blur: number, opacity: number, dashLen: number, backPx: number) => (
    <rect
      x={0}
      y={0}
      width={box.w}
      height={box.h}
      rx={rx}
      pathLength={100}
      fill="none"
      stroke={`url(#${gradientId})`}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={`${dashLen} ${100 - dashLen}`}
      className="bui-composer-loader-rect"
      // SVG-native blur, not CSS filter: WebKit (iOS Safari and every iPhone
      // browser) ignores CSS filters on individual SVG elements, which
      // rendered the whole light razor-sharp on phones.
      filter={blur > 0 ? `url(#${gradientId}-b${String(blur).replace(".", "_")})` : undefined}
      style={{
        opacity,
        animation: `bui-composer-loader-dash ${speed}s linear ${(dashPhase(dashLen, backPx) * speed) / 100}s infinite ${direction}`,
      }}
    />
  );

  /** One feGaussianBlur per blur radius the layers use. The region is
   *  widened well past the stroke so the blur never clips at the filter
   *  bounds. */
  const blurFilter = (radius: number) => (
    <filter
      key={radius}
      id={`${gradientId}-b${String(radius).replace(".", "_")}`}
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >
      <feGaussianBlur stdDeviation={radius} />
    </filter>
  );

  return (
    <div className={cx("relative", className)}>
      {surface && (
        <span
          aria-hidden
          className="absolute inset-0 bg-background-primary-default shadow-xs"
          style={{ borderRadius: cornerRadius }}
        />
      )}

      <span
        ref={clipRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          borderRadius: cornerRadius,
          opacity: active ? 1 : 0,
          transition: "opacity 450ms ease",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${box.w} ${box.h}`}
          preserveAspectRatio="none"
          style={{ opacity: intensity }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={c0} />
              <stop offset="30%" stopColor={c1} />
              <stop offset="50%" stopColor={mid} />
              <stop offset="70%" stopColor={c2} />
              <stop offset="100%" stopColor={c3} />
            </linearGradient>
            {[14, 6, 0.5].map(blurFilter)}
          </defs>
          {/* wide bloom bleeding inward (outer half clipped by the pill) */}
          {stroke(bloom * 2, 14, bloomStrength, band * 0.9, bloom + 16)}
          {/* tight glow */}
          {stroke(8, 6, 0.8, band * 0.95, 10)}
          {/* crisp refraction line, tip leading */}
          {stroke(2.5, 0.5, 1, band, 0)}
        </svg>
      </span>

      <div className="relative">{children}</div>
    </div>
  );
}
