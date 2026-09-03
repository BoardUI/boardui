"use client";

import { RiArrowRightLine } from "@remixicon/react";

import { COMPONENT_SECTIONS, type Entry } from "@/components/application/docs/components-index";
import {
  FREE_COMPONENT_PREVIEWS,
  FREE_PREVIEW_OPTIONS,
  TEMPLATE_CARD,
  TemplateFrame,
} from "@/components/application/docs/component-previews-free";
import type { PreviewHref } from "@/components/application/docs/component-preview-hrefs";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { PREVIEW_IMAGE_SLUGS } from "@/components/application/docs/preview-images";
import { ShowcaseCard } from "@/components/application/docs/showcase-card";
import { cx } from "@/utils/cx";

const SITE = "https://www.boardui.com";

export type CatalogTier = "all" | "free" | "pro";

/** The Free / Pro pills over the catalogue; the page owns the state and hands it to both. */
export function CatalogTierFilter({
  tier,
  onChange,
}: {
  tier: CatalogTier;
  onChange: (tier: CatalogTier) => void;
}) {
  return (
    <SegmentedControl
      aria-label="Show"
      selectedKeys={[tier]}
      onSelectionChange={(keys) => {
        const [key] = keys;
        if (key !== undefined) onChange(String(key) as CatalogTier);
      }}
    >
      <SegmentedControlItem id="all">All</SegmentedControlItem>
      <SegmentedControlItem id="free">Free</SegmentedControlItem>
      <SegmentedControlItem id="pro">Pro</SegmentedControlItem>
    </SegmentedControl>
  );
}

/**
 * The boardui.com components index, as the starter shows it: the same
 * sections, names and descriptions, every card opening its docs page on the
 * site in a new tab. Free components render their live previews, Pro
 * templates frame the site's embed routes, and the other Pro components show
 * pictures captured from the site's index (scripts/capture-previews.mjs):
 * nothing of Pro may enter this repository, so the pictures travel instead
 * of the code. `tier` narrows every section to Free or Pro.
 */
export function ComponentsCatalog({ tier = "all" }: { tier?: CatalogTier }) {
  const shipped = COMPONENT_SECTIONS.flatMap((s) => s.entries).filter((e) => e.status === "shipped");
  const free = shipped.filter((e) => e.tier === "free").length;
  const sections = COMPONENT_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) => tier === "all" || entry.tier === tier),
  })).filter((section) => section.entries.length > 0);
  return (
    // The shell's column is narrowed to 964px for this page (two 472px
    // template cards and a gap), so the heading and every grid share one edge.
    <div className="flex w-full flex-col gap-10">
      <p className="max-w-2xl text-body-regular text-text-secondary">
        Every component, block, chart and template in BoardUI, {shipped.length} in all. The{" "}
        {free} free ones are already in this project as source; each card opens its docs on
        boardui.com, with the install command and the props.
      </p>
      {sections.map((section) => (
        <section key={section.title} id={section.title.toLowerCase()} className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-title-2-medium text-text-primary">{section.title}</h2>
            <span className="text-body-medium text-text-tertiary">{section.entries.length}</span>
            <span className="hidden text-body-regular text-text-tertiary sm:inline">{section.blurb}</span>
          </div>
          <div
            className={cx(
              "grid w-full grid-cols-1 gap-x-5 gap-y-3 sm:gap-5",
              section.wide ? "xl:grid-cols-[repeat(2,472px)]" : "sm:grid-cols-2 xl:grid-cols-[repeat(3,304px)]",
            )}
          >
            {section.entries.filter(hasImage).map((entry) => (
              <PreviewCard key={entry.name} entry={entry} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.entries.filter((entry) => !hasImage(entry)).map((entry) => (
              <CatalogCard key={entry.name} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const slugOf = (entry: Entry) => entry.href.replace("/components/", "");
const hasImage = (entry: Entry) =>
  entry.status === "shipped" &&
  (Boolean(livePreview(entry)) || Boolean(TEMPLATE_EMBEDS[slugOf(entry)]) || PREVIEW_IMAGE_SLUGS.has(slugOf(entry)));

const livePreview = (entry: Entry) => FREE_COMPONENT_PREVIEWS[entry.href as PreviewHref];

/** Pro templates have embed routes on the site; a card frames the real thing, scaled down. */
const TEMPLATE_EMBEDS: Record<string, string> = {
  "ai-chat": "chat",
  "ai-image-generation": "image",
  "ai-profile": "profile",
  "home-dashboard": "analytics",
  "medical-profile": "healthcare",
  "marketing-dashboard": "marketing",
  "finance-dashboard": "finance",
  "hr-management": "hr",
};

/**
 * The template's embed route in the site's own template frame: the frame is
 * the 1280x855 desktop canvas (a 390x844 phone below `sm`) scaled to the
 * card, so the embedded page lays out exactly as the live one on the site.
 */
function TemplateEmbed({ id, title }: { id: string; title: string }) {
  return (
    <TemplateFrame>
      <iframe
        src={`${SITE}/embed/templates/${id}`}
        title={`${title} preview`}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none size-full border-0"
      />
    </TemplateFrame>
  );
}

/**
 * The index's showcase card. Free components render live, exactly as on the
 * site; Pro templates frame the site's embed route scaled down; other Pro
 * components show the captured picture. No Pro code ever comes here.
 */
function PreviewCard({ entry }: { entry: Entry }) {
  const Preview = FREE_COMPONENT_PREVIEWS[entry.href as PreviewHref];
  const slug = slugOf(entry);
  const embed = TEMPLATE_EMBEDS[slug];
  return (
    <ShowcaseCard
      external
      href={`${SITE}${entry.href}`}
      title={entry.name}
      description={entry.description}
      {...(Preview ? (FREE_PREVIEW_OPTIONS[entry.href] ?? {}) : {})}
      {...(embed ? TEMPLATE_CARD : {})}
    >
      {Preview ? (
        <Preview />
      ) : embed ? (
        <TemplateEmbed id={embed} title={entry.name} />
      ) : (
        <>
          {/* Plain img on purpose: small fixed-size WebPs served by boardui.com;
              next/image would make every clone configure a remote pattern. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE}/previews/${slug}.webp`} alt="" loading="lazy" className="size-full object-cover object-top dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${SITE}/previews/${slug}-dark.webp`} alt="" loading="lazy" className="hidden size-full object-cover object-top dark:block" />
        </>
      )}
    </ShowcaseCard>
  );
}

function CatalogCard({ entry }: { entry: Entry }) {
  if (entry.status !== "shipped") {
    return (
      <div className="flex flex-col gap-1 rounded-2lg border border-dashed border-border-button-default p-4">
        <div className="flex items-center gap-2">
          <span className="text-body-medium text-text-tertiary">{entry.name}</span>
          <Tag>Soon</Tag>
        </div>
        <span className="text-body-regular text-text-tertiary">{entry.description}</span>
      </div>
    );
  }
  return (
    <a
      href={`${SITE}${entry.href}`}
      target="_blank"
      rel="noreferrer"
      className={cx(
        "group relative flex flex-col gap-1 rounded-2lg border border-border-button-default bg-background-primary-default p-4",
        "transition-[background-color,box-shadow] duration-150 ease",
        "hover:bg-background-primary-hover hover:shadow-xs",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-center gap-2">
        {entry.icon && (
          <entry.icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
        )}
        <span className="text-body-medium text-text-primary">{entry.name}</span>
        {entry.isNew && <Tag tone="new">New</Tag>}
        {entry.tier === "pro" && <Tag>Pro</Tag>}
      </div>
      <span className="text-body-regular text-text-secondary">{entry.description}</span>
      <RiArrowRightLine
        aria-hidden
        className={cx(
          "absolute top-4 right-4 size-4 text-foreground-icon-secondary",
          "-translate-x-1 opacity-0 transition-[opacity,translate] duration-150 ease",
          "group-hover:translate-x-0 group-hover:opacity-100",
        )}
      />
    </a>
  );
}

/** The docs index's small uppercase tags, as they are drawn on the site. */
function Tag({ tone = "neutral", children }: { tone?: "neutral" | "new"; children: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-sm px-1 py-px text-[10px] leading-4 font-semibold tracking-wide uppercase",
        tone === "new"
          ? "bg-badge-new-background text-badge-new-text"
          : "bg-background-tertiary-default text-text-secondary",
      )}
    >
      {children}
    </span>
  );
}
