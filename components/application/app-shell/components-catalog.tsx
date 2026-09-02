"use client";

import { RiArrowRightUpLine } from "@remixicon/react";

import { COMPONENT_SECTIONS, type Entry } from "@/components/application/docs/components-index";
import { cx } from "@/utils/cx";

const SITE = "https://www.boardui.com";

/**
 * The boardui.com components index, as the starter shows it: the same
 * sections, names and descriptions, every card opening its docs page on the
 * site in a new tab. Deliberately no live previews: the site's preview system
 * renders Pro components, and nothing of Pro may enter this repository.
 */
export function ComponentsCatalog() {
  const shipped = COMPONENT_SECTIONS.flatMap((s) => s.entries).filter((e) => e.status === "shipped");
  const free = shipped.filter((e) => e.tier === "free").length;
  return (
    <div className="flex w-full flex-col gap-10">
      <p className="max-w-2xl text-body-regular text-text-secondary">
        Every component, block, chart and template in BoardUI, {shipped.length} in all. The{" "}
        {free} free ones are already in this project as source; each card opens its docs on
        boardui.com, with the install command and the props.
      </p>
      {COMPONENT_SECTIONS.map((section) => (
        <section key={section.title} id={section.title.toLowerCase()} className="flex flex-col gap-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-title-2-medium text-text-primary">{section.title}</h2>
            <span className="text-body-medium text-text-tertiary">{section.entries.length}</span>
            <span className="hidden text-body-regular text-text-tertiary sm:inline">{section.blurb}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.entries.map((entry) => (
              <CatalogCard key={entry.name} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
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
      <div className="flex items-center gap-2 pr-6">
        {entry.icon && (
          <entry.icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
        )}
        <span className="text-body-medium text-text-primary">{entry.name}</span>
        {entry.isNew && <Tag tone="new">New</Tag>}
        {entry.tier === "pro" && <Tag>Pro</Tag>}
      </div>
      <span className="text-body-regular text-text-secondary">{entry.description}</span>
      <RiArrowRightUpLine
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
