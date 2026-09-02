"use client";

import {
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import { cx } from "@/utils/cx";

/**
 * One-time-code input: one box per digit, side by side.
 *
 * The awkward part of an OTP field is that it looks like N inputs but behaves
 * like one value, and the two views have to stay in step in every direction:
 *
 *   type      fills a box and advances
 *   Backspace clears the box, or steps back when the box is already empty
 *   arrows    move between boxes without changing anything
 *   paste     distributes across the boxes from wherever the caret is
 *   autofill  the OS hands the whole code to the first box at once
 *
 * That last one is why every box carries `autoComplete="one-time-code"` and
 * why the change handler accepts more than a single character: iOS and Chrome
 * both deliver the full code into whichever box has focus, and a field that
 * only accepts one character silently drops five digits of it.
 *
 * Digits are monospace so the boxes stay optically even — in a proportional
 * face a `1` is visibly narrower than a `8`, which makes a row of fixed boxes
 * look mis-set even when it is perfectly aligned.
 */

export interface InputOtpProps {
  /** Number of digit boxes. */
  length?: number;
  /** Controlled value. Longer strings are truncated to `length`. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fires once the last box is filled. */
  onComplete?: (value: string) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
  /** Renders a gap between groups, e.g. `3` gives 000 000. */
  groupEvery?: number;
  "aria-label"?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const DIGITS_ONLY = /\D/g;

export function InputOtp({
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  isDisabled = false,
  isInvalid = false,
  groupEvery,
  "aria-label": ariaLabel = "One-time code",
  className,
  ref,
}: InputOtpProps) {
  const groupId = useId();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [internal, setInternal] = useState(defaultValue.replace(DIGITS_ONLY, "").slice(0, length));

  const controlled = value !== undefined;
  const code = (controlled ? value : internal).replace(DIGITS_ONLY, "").slice(0, length);

  const commit = (next: string) => {
    const clean = next.replace(DIGITS_ONLY, "").slice(0, length);
    if (!controlled) setInternal(clean);
    onChange?.(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const focusBox = (index: number) => {
    const target = inputsRef.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  /** Writes `digits` starting at `index`, which covers typing and autofill. */
  const writeFrom = (index: number, digits: string) => {
    const clean = digits.replace(DIGITS_ONLY, "");
    if (clean === "") return;

    const chars = code.padEnd(length, " ").split("");
    for (let offset = 0; offset < clean.length && index + offset < length; offset += 1) {
      chars[index + offset] = clean[offset];
    }
    commit(chars.join("").trimEnd());
    focusBox(index + clean.length);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (code[index]) {
        // Clear in place; the caret only steps back on an already-empty box,
        // which is what makes holding Backspace feel right.
        const chars = code.padEnd(length, " ").split("");
        chars[index] = " ";
        commit(chars.join("").trimEnd());
        return;
      }
      const chars = code.padEnd(length, " ").split("");
      chars[Math.max(0, index - 1)] = " ";
      commit(chars.join("").trimEnd());
      focusBox(index - 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    writeFrom(index, event.clipboardData.getData("text"));
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      // No `aria-invalid` here: `group` does not support it. Each box carries
      // its own, which is where a screen reader looks anyway.
      className={cx("flex items-center gap-2", className)}
    >
      {Array.from({ length }, (_, index) => {
        const filled = code[index] ?? "";
        const gapBefore = groupEvery !== undefined && index > 0 && index % groupEvery === 0;

        return (
          <div key={index} className={cx("flex items-center", gapBefore && "ml-3")}>
            <input
              ref={(node) => {
                inputsRef.current[index] = node;
              }}
              id={`${groupId}-${index}`}
              // `text` with a numeric mode rather than `number`: a number input
              // brings spinners, accepts `e` and `-`, and its value is empty
              // for anything it considers malformed.
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              // Long enough to accept a full autofilled code in one box.
              maxLength={length}
              disabled={isDisabled}
              aria-label={`Digit ${index + 1} of ${length}`}
              aria-invalid={isInvalid || undefined}
              value={filled}
              onChange={(event) => writeFrom(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              onPaste={(event) => onPaste(event, index)}
              onFocus={(event) => event.target.select()}
              className={cx(
                "size-12 rounded-2lg text-center font-mono text-title-3-medium tabular-nums",
                "bg-background-primary-default text-text-primary",
                "border border-border-button-default shadow-xs",
                "transition-[background-color,border-color,box-shadow] duration-150 ease outline-none",
                "hover:border-border-button-hover",
                "focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                // Red edge as well as the tint. `border-error-default` was
                // added to theme.css for this: the system had greys only.
                isInvalid &&
                  "border-border-error-default bg-background-tertiary-error text-foreground-icon-error hover:border-border-error-default",
                isDisabled &&
                  "cursor-not-allowed bg-background-primary-disabled text-text-tertiary shadow-none",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
