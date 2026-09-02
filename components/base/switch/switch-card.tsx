"use client";

import type { ComponentType, ReactNode, Ref } from "react";
import { Switch as AriaSwitch } from "react-aria-components";
import type { SwitchProps as AriaSwitchProps } from "react-aria-components";
import { cx } from "@/utils/cx";
import { SwitchTrack } from "./switch";
import type { SwitchShape, SwitchSize } from "./switch";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

/**
 * Selectable settings card: title + description on the left, Switch on the
 * right. The whole card toggles (react-aria Switch renders the label), so a
 * click anywhere flips the state — the switch counterpart to CheckboxCard.
 *
 * Card chrome mirrors CheckboxCard, but with rounded-xl (12px) corners:
 *   card   rounded-xl (12px), 1px border/button/default, pl 16 pr 20 py 12
 *   hover  bg background/primary/hover (#f7f7f7)
 *   title  Body 1/Medium, text/primary
 *   desc   Body 1/Regular, text/secondary
 */

export interface SwitchCardProps extends Omit<AriaSwitchProps, "children"> {
  title: ReactNode;
  description?: ReactNode;
  /** Optional 24×24 leading icon — pass a Remix Icon component (`RiMailLine`, not `<RiMailLine />`). */
  icon?: IconComponent;
  size?: SwitchSize;
  shape?: SwitchShape;
  ref?: Ref<HTMLLabelElement>;
}

export function SwitchCard({
  className,
  title,
  description,
  icon: Icon,
  size = "md",
  shape = "pill",
  ref,
  ...props
}: SwitchCardProps) {
  return (
    <AriaSwitch
      ref={ref}
      {...props}
      className={(state) =>
        cx(
          "group flex w-full items-center justify-between gap-3 rounded-xl border border-border-button-default py-3 pr-5 pl-4 select-none",
          "transition-colors duration-150 ease",
          state.isHovered && !state.isDisabled
            ? "bg-background-primary-hover"
            : "bg-background-primary-default",
          state.isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {(state) => (
        <>
          <span className="flex min-w-0 items-center gap-3">
            {Icon && <Icon className="size-6 shrink-0 text-foreground-icon-secondary" aria-hidden />}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-body-medium text-text-primary">{title}</span>
              {description !== undefined && description !== null && (
                <span className="truncate text-body-regular text-text-secondary">{description}</span>
              )}
            </span>
          </span>
          <span className="flex shrink-0 items-center">
            <SwitchTrack state={state} size={size} shape={shape} />
          </span>
        </>
      )}
    </AriaSwitch>
  );
}
