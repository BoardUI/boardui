"use client";

import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { Switch } from "@/components/base/switch/switch";
import { PlanArtFlame } from "./plan-art-flame";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "./settings-rows";

/**
 * Figma source: Board UI → "Settings/General" (node 4079:13037), the right
 * pane of the settings modal. Taller than the 614px modal, so the pane
 * scrolls within the shell.
 *
 * Sections, 24px apart:
 *   plan          "Current plan" chip, Ultra $149/mo, upgrade button, and the
 *                 artwork bleeding off the right edge under a radial fade
 *                 into the card background.
 *   limits        single row with a "Manage limits" button.
 *   pull requests two select rows (Review provider / PR destination).
 *   notifications four toggle rows, only "Critical requests" on by default.
 */

/** Compact white select trigger (h 32, radius/lg) per the Figma rows. */
const SELECT_TRIGGER = "h-8 w-auto gap-1 rounded-lg px-2 py-1.5";

export function SettingsGeneral({ planArtSrc }: { planArtSrc?: string }) {
  const [toggles, setToggles] = useState({
    critical: true,
    system: false,
    sound: false,
    dispatch: false,
  });

  const setToggle = (key: keyof typeof toggles) => (value: boolean) =>
    setToggles((t) => ({ ...t, [key]: value }));

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Current plan */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-background-secondary-default">
        {/* Artwork bleeding off the right edge, fading into the card bg.
            Rendered through a WebGL shader: waving like a wind-torn flag with
            a continuous burning-edge effect (see plan-art-flame.tsx). */}
        <div aria-hidden className="absolute -top-[11px] left-[328px] size-[277px]">
          <PlanArtFlame
            src={planArtSrc}
            className="size-full object-cover"
          />
          {/* Fades into the card, whatever colour that is: the stops mix the
              card's own token rather than a hardcoded #f7f7f7, which stayed
              white and haloed the artwork in dark mode. Mixing toward 0% of
              the token instead of `transparent` also avoids the grey fringe
              sRGB interpolation gives when a colour fades to rgba(0,0,0,0). */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(closest-side at center,
                color-mix(in srgb, var(--color-background-secondary-default) 0%, transparent) 13%,
                color-mix(in srgb, var(--color-background-secondary-default) 13%, transparent) 37%,
                color-mix(in srgb, var(--color-background-secondary-default) 85%, transparent) 86%,
                var(--color-background-secondary-default) 100%)`,
            }}
          />
        </div>

        <div className="relative flex flex-col gap-2.5 py-3 pr-2.5 pl-3">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-body-2-medium text-text-secondary">
              Current plan
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-headline-medium text-text-primary">Ultra $149/mo</p>
              <p className="text-body-2-regular text-text-secondary">
                You are on 7x more usage than Regular.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="small" className="w-fit">
            Upgrade to Max
          </Button>
        </div>
      </div>

      {/* Limits */}
      <SettingsCard>
        <SettingsRow label="Limits" description="You are on 7x more usage than Premium">
          <Button variant="secondary" size="small">
            Manage limits
          </Button>
        </SettingsRow>
      </SettingsCard>

      {/* Pull Requests */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Pull Requests</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Review provider"
            description="Select Github or other providers for reviews"
          >
            <Select
              aria-label="Review provider"
              defaultSelectedKey="github"
              triggerClassName={SELECT_TRIGGER}
            >
              <SelectItem id="github">GitHub</SelectItem>
              <SelectItem id="gitlab">GitLab</SelectItem>
              <SelectItem id="bitbucket">Bitbucket</SelectItem>
            </Select>
          </SettingsRow>
          <SettingsRow
            label="PR destination"
            description="Open pull request links inside your app"
          >
            <Select
              aria-label="PR destination"
              defaultSelectedKey="inside"
              triggerClassName={SELECT_TRIGGER}
            >
              <SelectItem id="inside">Inside BoardUI</SelectItem>
              <SelectItem id="browser">In the browser</SelectItem>
            </Select>
          </SettingsRow>
        </SettingsCard>
      </div>

      {/* Notifications */}
      <div className="flex w-full flex-col gap-2">
        <SettingsSectionLabel>Notifications</SettingsSectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Critical requests"
            description="Get notified when the mode needs to make a critical decision"
          >
            <Switch
              aria-label="Critical requests"
              isSelected={toggles.critical}
              onChange={setToggle("critical")}
            />
          </SettingsRow>
          <SettingsRow
            label="System notifications"
            description="Show fundamental notifications when an agent completes a task"
          >
            <Switch
              aria-label="System notifications"
              isSelected={toggles.system}
              onChange={setToggle("system")}
            />
          </SettingsRow>
          <SettingsRow
            label="Completion sound"
            description="Sound effect a task is completed"
          >
            <Switch
              aria-label="Completion sound"
              isSelected={toggles.sound}
              onChange={setToggle("sound")}
            />
          </SettingsRow>
          <SettingsRow
            label="Dispatch alerts"
            description="Push notification on your phone when BoardUI messages you"
          >
            <Switch
              aria-label="Dispatch alerts"
              isSelected={toggles.dispatch}
              onChange={setToggle("dispatch")}
            />
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  );
}
