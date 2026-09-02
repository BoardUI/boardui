"use client";

import { useEffect, useState } from "react";
import { cx } from "@/utils/cx";

/**
 * Auto-advancing artwork for the auth card's `media` slot.
 *
 * The transition is a four-beat cycle rather than a plain slide. The image
 * fills the panel edge to edge; when its turn is up it shrinks and rounds off
 * into a card, holds there long enough to read as a deliberate pause, and only
 * then travels left. The next image rides in beside it already card-sized, and
 * grows back out to fill the panel once it has landed. Shrinking first is what
 * makes the movement legible: a full-bleed image sliding under a hard edge
 * reads as a cut, while a card that detaches, moves, and settles reads as one
 * object being replaced by another.
 *
 * The travel happens in depth, not flat across the panel. The panel holds a
 * perspective, and the cards leave and arrive pushed back along Z and turned
 * on their vertical axis, so the outgoing one banks away to the left while the
 * next swings in from the right and squares up as it lands. Both are angled
 * away from the middle, as though they sit on a drum turning past the viewer,
 * which is what gives the movement a front and a back instead of a left and a
 * right.
 *
 * Every slide is placed by where it sits relative to the current one, so the
 * set travels in one direction forever and the wrap back to the first image is
 * just another step left. The cost of that arrangement is that the slide
 * leaving the frame has to jump from the left side to the back of the queue on
 * the right, so transitions are enabled only for the slides actually moving in
 * a given beat; everything else is repositioned with them switched off.
 *
 * Plain `<img>` rather than `next/image`: this file installs into other
 * people's projects, and it should not decide their image pipeline for them.
 * The first slide is eager and the rest lazy, so the card paints immediately
 * without pulling four files at once.
 *
 * It advances on its own and offers no controls. The artwork beside a sign-in
 * form is atmosphere, not content — a visitor is there to get in, and giving
 * them arrows to click is inviting them away from the thing they came to do.
 * Honouring `prefers-reduced-motion` means holding on the first slide.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Card state: shrunk to a rounded tile, and the size it rides in at. */
const CARD_SCALE = 0.82;
const ENTER_SCALE = 0.8;
const CARD_RADIUS = 24;

/** How deep the drum is, and how far the cards turn on it. */
const PERSPECTIVE = 850;
const DEPTH = 220;
const TILT = 48;

const SHRINK_MS = 450;
/** The deliberate pause once it has become a card, before it moves. */
const HOLD_MS = 200;
const SLIDE_MS = 700;
const GROW_MS = 500;

/**
 * `idle`   at rest, full bleed
 * `shrink` pulling back into a card, then holding
 * `slide`  travelling left while the next one rides in
 * `enter`  the frame where the new slide takes over, before it grows
 */
type Phase = "idle" | "shrink" | "slide" | "enter";

const NEXT_PHASE: Record<Phase, Phase> = {
  idle: "shrink",
  shrink: "slide",
  slide: "enter",
  enter: "idle",
};

export interface AuthMediaSlide {
  src: string;
  /** Decorative by default: the artwork carries no information the form needs. */
  alt?: string;
}

export function AuthMediaCarousel({
  slides,
  interval = 3200,
  className,
}: {
  slides: AuthMediaSlide[];
  /** Milliseconds a slide rests at full bleed, before the transition begins. */
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    // `enter` is only a re-labelling: the outgoing slide is dropped and the
    // incoming one takes position 0 at the size it was already drawn at, so it
    // needs a frame to paint before the grow can transition from it.
    const delay = {
      idle: interval,
      shrink: SHRINK_MS + HOLD_MS,
      slide: SLIDE_MS,
      enter: 20,
    }[phase];

    const timer = window.setTimeout(() => {
      if (phase === "slide") setIndex((current) => (current + 1) % count);
      setPhase(NEXT_PHASE[phase]);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [phase, count, interval]);

  return (
    <div
      style={{ perspective: `${PERSPECTIVE}px` }}
      className={cx("absolute inset-0 overflow-hidden", className)}
    >
      {slides.map((slide, slideIndex) => {
        // 0 is the slide in play, 1 is next in the queue, and everything else
        // waits off to the right until its turn comes round.
        const position = (slideIndex - index + count) % count;
        const current = position === 0;
        const upNext = position === 1;

        // Where this slide sits on the drum. `arrived` is square to the
        // viewer but still card-sized: growing is the beat after.
        const transform = current
          ? phase === "slide"
            ? `translateX(-100%) translateZ(${-DEPTH}px) rotateY(${-TILT}deg) scale(${CARD_SCALE})`
            : phase === "shrink"
              ? `scale(${CARD_SCALE})`
              : phase === "enter"
                ? `scale(${ENTER_SCALE})`
                : "scale(1)"
          : upNext && phase === "slide"
            ? `scale(${ENTER_SCALE})`
            : `translateX(100%) translateZ(${-DEPTH}px) rotateY(${TILT}deg) scale(${ENTER_SCALE})`;

        // Only the slides in motion this beat may transition. The rest are
        // being repositioned, and a transition would streak them across.
        const moving = current || (upNext && phase === "slide");

        return (
          // Deliberate: this file installs into other projects and should not
          // require next/image. Swap it for your own loader if you have one.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt ?? ""}
            aria-hidden={slide.alt ? undefined : true}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            style={{
              transform,
              borderRadius: current && phase === "idle" ? 0 : CARD_RADIUS,
              transitionDuration:
                phase === "slide" ? `${SLIDE_MS}ms` : phase === "shrink" ? `${SHRINK_MS}ms` : `${GROW_MS}ms`,
            }}
            className={cx(
              "absolute inset-0 size-full object-cover",
              moving && phase !== "enter"
                ? "transition-[transform,border-radius] ease-in-out"
                : "transition-none",
            )}
          />
        );
      })}

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <span
              key={slide.src}
              aria-hidden
              className={cx(
                "h-1.5 rounded-full bg-white transition-all duration-500 ease-out",
                slideIndex === index ? "w-5 opacity-90" : "w-1.5 opacity-45",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
