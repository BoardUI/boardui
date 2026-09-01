"use client";

import { useRef, useState, type ComponentProps } from "react";
import { CalendarDate } from "@internationalized/date";
import { RiCalendarLine, RiExternalLinkLine, RiLogoutCircleLine, RiMailLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { DatePicker } from "@/components/base/date-picker/date-picker";
import { Input } from "@/components/base/input/input";
import { Switch } from "@/components/base/switch/switch";
import { cx } from "@/utils/cx";
import {
  SettingsCard,
  SettingsRow,
  SettingsValueField,
} from "./settings-rows";

/**
 * Figma source: Board UI → "Settings/Profile" (node 4081:13943), the right
 * pane of the settings modal.
 *
 * Two cards, 24px apart:
 *   1. identity   Email / First name / Last name as editable design-system
 *                 Inputs (small, 202px — mail icon on Email), Date of birth
 *                 (white date-picker trigger, 202px)
 *   2. account    BoardUI account → "Manage", Public profile toggle (on),
 *                 Device ID (muted, truncated), Log out from all devices.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatBirthDate(date: CalendarDate) {
  return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

/**
 * Design-system Input that commits on Enter / blur: Enter just blurs the
 * field, and blur fires `onSaved` only when the value actually changed since
 * the last commit — so clicking in and out without typing stays silent.
 */
function SavableInput({
  initialValue,
  onSaved,
  ...inputProps
}: { initialValue: string; onSaved?: () => void } & Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "defaultValue"
>) {
  const [value, setValue] = useState(initialValue);
  const committed = useRef(initialValue);

  return (
    <Input
      size="small"
      {...inputProps}
      value={value}
      onChange={setValue}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLElement).blur();
      }}
      onBlur={() => {
        if (value !== committed.current) {
          committed.current = value;
          onSaved?.();
        }
      }}
      className={cx("w-[202px] shrink-0", inputProps.className)}
    />
  );
}

export function SettingsProfile({ onSaved }: { onSaved?: () => void } = {}) {
  const [birthDate, setBirthDate] = useState<CalendarDate>(new CalendarDate(1997, 7, 28));
  const [birthOpen, setBirthOpen] = useState(false);
  const birthTriggerRef = useRef<HTMLButtonElement>(null);
  const [publicProfile, setPublicProfile] = useState(true);

  return (
    <div className="flex w-full flex-col gap-6">
      <SettingsCard>
        <SettingsRow label="Email">
          <SavableInput
            aria-label="Email"
            type="email"
            leadingIcon={RiMailLine}
            initialValue="hi@mertcan.works"
            onSaved={onSaved}
          />
        </SettingsRow>
        <SettingsRow label="First name">
          <SavableInput aria-label="First name" initialValue="Mertcan" onSaved={onSaved} />
        </SettingsRow>
        <SettingsRow label="Last name">
          <SavableInput aria-label="Last name" initialValue="Esmergül" onSaved={onSaved} />
        </SettingsRow>
        <SettingsRow label="Date of birth">
          <button
            ref={birthTriggerRef}
            type="button"
            onClick={() => setBirthOpen((o) => !o)}
            className={[
              "flex h-8 w-[202px] shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-2",
              "border border-border-button-default bg-background-primary-default shadow-xs",
              "transition-colors duration-150 ease hover:bg-background-primary-hover",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            ].join(" ")}
          >
            <RiCalendarLine className="size-[18px] shrink-0 text-foreground-icon-primary" aria-hidden />
            <span className="px-0.5 text-body-regular whitespace-nowrap text-text-primary">
              {formatBirthDate(birthDate)}
            </span>
          </button>
          <DatePicker
            aria-label="Date of birth"
            triggerRef={birthTriggerRef}
            isOpen={birthOpen}
            onOpenChange={setBirthOpen}
            value={birthDate}
            onChange={(next) => next && setBirthDate(next)}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow label="BoardUI account">
          <Button variant="secondary" size="small" leadingIcon={RiExternalLinkLine}>
            Manage
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Public profile"
          description="When enabled your profile page will be visible to anyone"
        >
          <Switch
            aria-label="Public profile"
            isSelected={publicProfile}
            onChange={setPublicProfile}
          />
        </SettingsRow>
        <SettingsRow label="Device ID">
          <SettingsValueField muted>593e2611-b9e3-44e2-1289-ab3f9d21</SettingsValueField>
        </SettingsRow>
        <SettingsRow label="Log out from all devices">
          <Button variant="secondary" size="small" leadingIcon={RiLogoutCircleLine}>
            Logout
          </Button>
        </SettingsRow>
      </SettingsCard>
    </div>
  );
}
