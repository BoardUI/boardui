"use client";

import {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Group as AriaGroup, TextArea as AriaTextArea } from "react-aria-components";
import type { TextAreaProps as AriaTextAreaProps } from "react-aria-components";
import { HintText } from "@/components/base/input/hint-text";
import { Label } from "@/components/base/input/label";
import {
  TextField,
  TextFieldContext,
  type InputSize,
  type TextFieldProps,
} from "@/components/base/input/input";
import { cx, sortCx } from "@/utils/cx";

/**
 * Multiline sibling of `Input` — same React Aria plumbing, same field shell,
 * same tokens. It reuses `Input`'s `TextField`, `Label` and `HintText`, so a
 * textarea sitting next to an input in a form lines up to the pixel.
 *
 * Architecture (mirrors input.tsx):
 *
 *   TextareaBase — the styled shell. Renders <AriaGroup> + <AriaTextArea>.
 *                  State (hover / focus / disabled / invalid) arrives as
 *                  render-prop booleans from Aria.
 *   Textarea     — opinionated composition: TextField → Label → TextareaBase
 *                  → HintText (+ optional character counter). The component
 *                  most consumers use.
 *
 * What a textarea adds over the single-line field:
 *   - `rows` sets the resting height (3 lines by default)
 *   - `autoResize` grows the field a line at a time up to `maxRows`, then
 *     scrolls — the pattern the composer prompt uses
 *   - `resize` exposes the native grab handle, off when `autoResize` is on
 *   - `showCount` pairs with `maxLength` for the counter settings pages want
 */

type TextareaSize = InputSize;

export type TextareaResize = "none" | "vertical";

/* -------------------------------------------------------------------------- */
/*  TextareaBase                                                               */
/* -------------------------------------------------------------------------- */

export interface TextareaBaseProps
  extends Omit<AriaTextAreaProps, "size" | "className" | "rows"> {
  size?: TextareaSize;
  className?: string;
  /** Resting height, in lines. Also the floor when `autoResize` is on. */
  rows?: number;
  /** Grow with the content instead of scrolling at `rows`. */
  autoResize?: boolean;
  /** Ceiling for `autoResize`, in lines. Past it the field scrolls. */
  maxRows?: number;
  /** Native resize handle. Ignored (forced `none`) while `autoResize` is on. */
  resize?: TextareaResize;
  /** Class for the field shell. */
  fieldClassName?: string;
  /** Ref to the <textarea> element. */
  ref?: Ref<HTMLTextAreaElement>;
  /** Ref to the field shell wrapper. */
  groupRef?: Ref<HTMLDivElement>;
}

const textareaStyles = sortCx({
  field: [
    "relative flex w-full flex-col",
    "rounded-2lg",
    "bg-background-tertiary-default text-foreground-icon-tertiary",
    "ring-2 ring-inset ring-transparent",
    "transition-[background-color,box-shadow,color] duration-[var(--input-transition-ms)] ease",
  ].join(" "),

  // Matches Input's insets, so a stacked input and textarea share one edge:
  // 8px shell + 4px on the control = 12px to the text (10px at `small`).
  fieldSize: {
    medium: "p-2",
    small: "px-1.5 py-2",
  },

  textarea: [
    "block w-full min-w-0 bg-transparent border-0 outline-none m-0 p-0 px-1",
    "font-sans text-body-regular text-text-primary",
    "placeholder:text-text-tertiary",
    "focus:placeholder:text-text-primary",
    "disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text",
    "disabled:cursor-not-allowed",
    "aria-invalid:placeholder:text-text-error-placeholder",
  ].join(" "),

  resize: {
    none: "resize-none",
    vertical: "resize-y",
  },

  footer: "flex w-full items-start justify-between gap-3",
  count: "ms-auto shrink-0 pt-px text-caption-1-medium text-text-tertiary tabular-nums",
});

/** Fallback line box for `text-body-regular` (14/20) before styles resolve. */
const FALLBACK_LINE_HEIGHT = 20;

export function TextareaBase({
  size: sizeProp,
  rows = 3,
  autoResize = false,
  maxRows,
  resize = "vertical",
  fieldClassName,
  className,
  ref,
  groupRef,
  onInput,
  ...textareaProps
}: TextareaBaseProps) {
  const ctx = useContext(TextFieldContext);
  const size: TextareaSize = sizeProp ?? ctx.size ?? "medium";
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const attachRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
  };

  // Measure from zero so the field shrinks back as well as grows. Reading the
  // computed line box keeps the floor and ceiling honest when a consumer
  // overrides the type scale through `className`.
  const fit = () => {
    const field = innerRef.current;
    if (!field) return;
    if (!autoResize) {
      field.style.height = "";
      field.style.maxHeight = "";
      field.style.overflowY = "";
      return;
    }
    const line =
      parseFloat(window.getComputedStyle(field).lineHeight) || FALLBACK_LINE_HEIGHT;
    const ceiling = maxRows ? maxRows * line : Infinity;
    field.style.height = "0px";
    const next = Math.max(field.scrollHeight, rows * line);
    field.style.height = `${Math.min(next, ceiling)}px`;
    field.style.maxHeight = maxRows ? `${ceiling}px` : "";
    field.style.overflowY = next > ceiling ? "auto" : "hidden";
  };

  // No dependency list: typing on an uncontrolled field re-renders nothing,
  // so `onInput` handles keystrokes and this catches every other reason the
  // value moved (a controlled parent, a form reset, an autofill).
  useLayoutEffect(fit);

  return (
    <AriaGroup
      ref={groupRef}
      className={({ isFocusWithin, isHovered, isDisabled, isInvalid }) =>
        cx(
          textareaStyles.field,
          textareaStyles.fieldSize[size],
          // Hover: idle, no focus, no disabled, no invalid
          isHovered &&
            !isFocusWithin &&
            !isDisabled &&
            !isInvalid &&
            "ring-border-button-hover",
          // Focus wins over hover
          isFocusWithin &&
            !isDisabled &&
            !isInvalid &&
            "ring-border-button-active",
          // Disabled
          isDisabled &&
            "bg-input-disabled-background text-input-disabled-foreground",
          // Invalid
          isInvalid && "bg-background-tertiary-error text-foreground-icon-error",
          ctx.fieldClassName,
          fieldClassName,
        )
      }
    >
      <AriaTextArea
        ref={attachRef}
        rows={rows}
        {...textareaProps}
        onInput={(event) => {
          fit();
          onInput?.(event);
        }}
        className={cx(
          textareaStyles.textarea,
          textareaStyles.resize[autoResize ? "none" : resize],
          ctx.inputClassName,
          className,
        )}
      />
    </AriaGroup>
  );
}

TextareaBase.displayName = "TextareaBase";

/* -------------------------------------------------------------------------- */
/*  Textarea (composed)                                                        */
/* -------------------------------------------------------------------------- */

export interface TextareaProps
  extends Omit<TextFieldProps, "children">,
    Pick<
      TextareaBaseProps,
      | "rows"
      | "autoResize"
      | "maxRows"
      | "resize"
      | "fieldClassName"
      | "groupRef"
      | "ref"
    > {
  label?: ReactNode;
  hint?: ReactNode;
  /** Show an info icon next to the label. Replace with tooltip when Tooltip lands. */
  tooltip?: boolean | string;
  placeholder?: string;
  /** Hard character limit, enforced by the browser. */
  maxLength?: number;
  /** Show the character counter under the field (`12/280` with `maxLength`). */
  showCount?: boolean;
}

export function Textarea({
  label,
  hint,
  tooltip,
  placeholder,
  rows,
  autoResize,
  maxRows,
  resize,
  maxLength,
  showCount = false,
  fieldClassName,
  ref,
  groupRef,
  className,
  value,
  defaultValue,
  onChange,
  ...textFieldProps
}: TextareaProps) {
  // The counter needs the value, and React Aria's render props don't carry it.
  // Controlled fields read straight from the prop; uncontrolled ones keep the
  // length here so a keystroke re-renders the counter and nothing else.
  const [typedLength, setTypedLength] = useState(() => (defaultValue ?? "").length);
  const count = value !== undefined ? value.length : typedLength;

  return (
    <TextField
      {...textFieldProps}
      value={value}
      defaultValue={defaultValue}
      onChange={(next) => {
        if (showCount && value === undefined) setTypedLength(next.length);
        onChange?.(next);
      }}
      className={className}
      // Don't clobber an explicit aria-label; fall back to the placeholder
      // only for unlabelled fields that don't provide one.
      aria-label={
        textFieldProps["aria-label"] ??
        (!label && typeof placeholder === "string" ? placeholder : undefined)
      }
    >
      {({ isRequired, isInvalid }) => (
        <>
          {label && (
            <Label
              isRequired={isRequired}
              isInvalid={isInvalid}
              tooltip={tooltip}
            >
              {label}
            </Label>
          )}
          <TextareaBase
            ref={ref}
            groupRef={groupRef}
            placeholder={placeholder}
            rows={rows}
            autoResize={autoResize}
            maxRows={maxRows}
            resize={resize}
            maxLength={maxLength}
            fieldClassName={fieldClassName}
          />
          {(hint || showCount) && (
            <div className={textareaStyles.footer}>
              {hint && <HintText isInvalid={isInvalid}>{hint}</HintText>}
              {showCount && (
                <span
                  className={cx(
                    textareaStyles.count,
                    isInvalid && "text-text-error-primary",
                  )}
                >
                  {maxLength ? `${count}/${maxLength}` : count}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </TextField>
  );
}

Textarea.displayName = "Textarea";
