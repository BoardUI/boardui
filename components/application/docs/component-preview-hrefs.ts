/**
 * The entries that have a live preview on the component index.
 *
 * Deliberately a plain module with no `"use client"`: the index page is a
 * server component, and anything it imports from a client module comes back as
 * a client-reference proxy rather than the value. Reading the preview map
 * directly there silently returned `undefined` for every entry, so the page
 * needs a server-safe list to decide which card shape to render.
 *
 * `component-previews.tsx` types its map against this array, so adding a
 * preview without listing it here (or the reverse) is a type error rather than
 * a card that quietly never appears.
 */
export const PREVIEW_HREFS = [
  // Shared with the landing showcase
  "/components/data-table",
  "/components/stat-cards",
  "/components/activity-rings-card",
  "/components/sidebar",
  "/components/dropdown",
  "/components/agent-progress",
  "/components/task-list",
  "/components/web-search",
  "/components/chat-starter",
  "/components/ai-chat",
  "/components/ai-image-generation",
  "/components/ai-profile",
  "/components/calendar",
  "/components/date-picker",
  "/components/earnings-chart-card",
  "/components/file-upload",
  // Charts
  "/components/orders-chart-card",
  "/components/revenue-chart-card",
  "/components/line-chart-card",
  "/components/sleep-score-card",
  "/components/steps-card",
  "/components/most-active-days-card",
  "/components/contributions-card",
  "/components/radar-chart-card",
  "/components/radial-chart-card",
  "/components/funnel-chart-card",
  "/components/sankey-chart-card",
  "/components/heatmap-chart-card",
  "/components/stage-bars-card",
  "/components/agent-limits-card",
  "/components/bar-list-card",
  "/components/area-chart-card",
  "/components/combo-chart-card",
  "/components/scatter-chart-card",
  // Blocks
  "/components/agent-thinking",
  "/components/composer-loader",
  // Templates and foundations
  "/components/home-dashboard",
  "/components/medical-profile",
  "/components/marketing-dashboard",
  "/components/finance-dashboard",
  "/components/hr-management",
  "/components/auth-card",
  "/components/settings-modal",
  "/components/notification-center",
  "/components/color",
  "/components/typography",
  // Base
  "/components/announcement",
  "/components/notification",
  "/components/table",
  "/components/tabs",
  "/components/avatar",
  "/components/chip",
  "/components/breadcrumb",
  "/components/button",
  "/components/button-group",
  "/components/carousel",
  "/components/checkbox",
  "/components/close-button",
  "/components/divider",
  "/components/icon-button",
  "/components/input",
  "/components/input-otp",
  "/components/link-button",
  "/components/pagination",
  "/components/radio",
  "/components/segmented-control",
  "/components/select",
  "/components/slider",
  "/components/social-button",
  "/components/switch",
  "/components/tooltip",
] as const;

export type PreviewHref = (typeof PREVIEW_HREFS)[number];

const PREVIEW_HREF_SET = new Set<string>(PREVIEW_HREFS);

export function hasPreview(href: string): href is PreviewHref {
  return PREVIEW_HREF_SET.has(href);
}
