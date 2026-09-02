import { RiFontSize, RiPaletteLine } from "@remixicon/react";

/**
 * The catalogue behind boardui.com/components: every component, block, chart
 * and template with its docs page. Plain data, so the starter can show the same
 * list (linking out to the site) without carrying any component source.
 */
export type Entry = {
  name: string;
  href: string;
  description: string;
  tier: "free" | "pro";
  status: "shipped" | "planned";
  isNew?: boolean;
  /** Optional leading icon - used by the Foundations entries. */
  icon?: typeof RiPaletteLine;
};

const foundations: Entry[] = [
  {
    name: "Color",
    href: "/components/color",
    description: "The full palette and semantic tokens.",
    tier: "free",
    status: "shipped",
    icon: RiPaletteLine,
  },
  {
    name: "Typography",
    href: "/components/typography",
    description: "Type scale, weights, and text styles.",
    tier: "free",
    status: "shipped",
    icon: RiFontSize,
  },
];

const components: Entry[] = [
  { name: "Announcement", href: "/components/announcement", description: "Dismissible banner for product news.", tier: "free", status: "shipped" },
  { name: "Avatar", href: "/components/avatar", description: "User photo with initials fallback.", tier: "free", status: "shipped" },
  { name: "Breadcrumb", href: "/components/breadcrumb", description: "Path trail with collapsing levels.", tier: "free", status: "shipped" },
  { name: "Button", href: "/components/button", description: "Primary, secondary, and danger actions.", tier: "free", status: "shipped" },
  { name: "Button Group", href: "/components/button-group", description: "Fused row of selectable buttons.", tier: "free", status: "shipped" },
  { name: "Carousel", href: "/components/carousel", description: "Slide through cards with snap, arrows and dots.", tier: "free", status: "shipped", isNew: true },
  { name: "Checkbox", href: "/components/checkbox", description: "Animated tick, card variant, two sizes.", tier: "free", status: "shipped" },
  { name: "Chip", href: "/components/chip", description: "Compact removable filter tokens.", tier: "free", status: "shipped" },
  { name: "Close Button", href: "/components/close-button", description: "The little ×, done properly.", tier: "free", status: "shipped" },
  { name: "Date Picker", href: "/components/date-picker", description: "Popover calendar for single dates.", tier: "free", status: "shipped" },
  { name: "Divider", href: "/components/divider", description: "Single, double, and filled content separators.", tier: "free", status: "shipped", isNew: true },
  { name: "Dropdown", href: "/components/dropdown", description: "Composable menus - teams, models, actions.", tier: "free", status: "shipped" },
  { name: "File Upload", href: "/components/file-upload", description: "Drag, validate, and track upload progress.", tier: "free", status: "shipped" },
  { name: "Icon Button", href: "/components/icon-button", description: "Square action button, icon only.", tier: "free", status: "shipped" },
  { name: "Input", href: "/components/input", description: "Text field with addons and validation.", tier: "free", status: "shipped" },
  { name: "Input OTP", href: "/components/input-otp", description: "One-time-code boxes with paste and autofill.", tier: "free", status: "shipped" },
  { name: "Link Button", href: "/components/link-button", description: "Inline text action styled like a link.", tier: "free", status: "shipped" },
  { name: "Notification", href: "/components/notification", description: "Status messages with icons, avatars, and actions.", tier: "free", status: "shipped" },
  { name: "Pagination", href: "/components/pagination", description: "Page numbers with truncation.", tier: "free", status: "shipped" },
  { name: "Radio", href: "/components/radio", description: "Gradient dot, card variant, two sizes.", tier: "free", status: "shipped" },
  { name: "Segmented Control", href: "/components/segmented-control", description: "Sliding pill option switcher.", tier: "free", status: "shipped" },
  { name: "Select", href: "/components/select", description: "Single-choice listbox with search.", tier: "free", status: "shipped" },
  { name: "Slider", href: "/components/slider", description: "Single-value and min/max range selection.", tier: "free", status: "shipped", isNew: true },
  { name: "Social Button", href: "/components/social-button", description: "Sign-in buttons for 24 providers, logos included.", tier: "free", status: "shipped" },
  { name: "Switch", href: "/components/switch", description: "On/off toggle with spring motion.", tier: "free", status: "shipped" },
  { name: "Table", href: "/components/table", description: "Sortable columns, sticky header.", tier: "free", status: "shipped" },
  { name: "Tabs", href: "/components/tabs", description: "Underline and pill tab lists.", tier: "free", status: "shipped" },
  { name: "Tooltip", href: "/components/tooltip", description: "Positioned hints on hover and focus.", tier: "free", status: "shipped" },
];

const blocks: Entry[] = [
  { name: "Agent Thinking", href: "/components/agent-thinking", description: "Agent thinking indicators for chat composers.", tier: "free", status: "shipped", isNew: true },
  { name: "Composer Loader", href: "/components/composer-loader", description: "Orbiting light band for a working composer.", tier: "free", status: "shipped", isNew: true },
  { name: "Auth Card", href: "/components/auth-card", description: "Sign-in and sign-up blocks with social login.", tier: "free", status: "shipped", isNew: true },
  { name: "Web Search", href: "/components/web-search", description: "Research trail with the sources an agent opened.", tier: "pro", status: "shipped", isNew: true },
  { name: "Task List", href: "/components/task-list", description: "Streaming agent log that reveals step by step.", tier: "pro", status: "shipped", isNew: true },
  { name: "Agent Limits", href: "/components/agent-limits-card", description: "Context window and plan usage limits.", tier: "pro", status: "shipped", isNew: true },
  { name: "Agent Progress", href: "/components/agent-progress", description: "Collapsible progress for multi-step AI tasks.", tier: "pro", status: "shipped" },
  { name: "Calendar", href: "/components/calendar", description: "Full month view with event pills.", tier: "pro", status: "shipped" },
  { name: "Data Table", href: "/components/data-table", description: "Filters, selection, and pagination wired up.", tier: "free", status: "shipped" },
  { name: "Notification Center", href: "/components/notification-center", description: "Grouped activity inbox with tabs and actions.", tier: "free", status: "shipped" },
  { name: "Settings Modal", href: "/components/settings-modal", description: "Multi-page settings in a controlled dialog.", tier: "free", status: "shipped" },
  { name: "Sidebar", href: "/components/sidebar", description: "Floating app navigation with teams menu.", tier: "free", status: "shipped" },
  { name: "Stat Cards", href: "/components/stat-cards", description: "KPI cards with delta chips or a footer band.", tier: "free", status: "shipped", isNew: true },
];

const charts: Entry[] = [
  { name: "Orders Chart", href: "/components/orders-chart-card", description: "Monthly bars, this year beside last.", tier: "free", status: "shipped", isNew: true },
  { name: "Revenue Chart", href: "/components/revenue-chart-card", description: "This year against last, area over a dashed line.", tier: "free", status: "shipped", isNew: true },
  { name: "Activity Rings", href: "/components/activity-rings-card", description: "Concentric progress rings, Apple style.", tier: "pro", status: "shipped" },
  { name: "Area Chart", href: "/components/area-chart-card", description: "Stacked, overlapping or 100% area series.", tier: "pro", status: "shipped", isNew: true },
  { name: "Bar List", href: "/components/bar-list-card", description: "Ranked breakdown rows with share bars and tabs.", tier: "pro", status: "shipped", isNew: true },
  { name: "Combo Chart", href: "/components/combo-chart-card", description: "Bars and a line on independent axes.", tier: "pro", status: "shipped", isNew: true },
  { name: "Contributions", href: "/components/contributions-card", description: "GitHub-style activity heatmap.", tier: "pro", status: "shipped" },
  { name: "Earnings Chart", href: "/components/earnings-chart-card", description: "Bar chart with period comparison.", tier: "pro", status: "shipped" },
  { name: "Funnel Chart", href: "/components/funnel-chart-card", description: "Flow funnel with tapered stages and conversion pills.", tier: "pro", status: "shipped", isNew: true },
  { name: "Heatmap Chart", href: "/components/heatmap-chart-card", description: "Matrix heatmap with a theme-following ramp.", tier: "pro", status: "shipped", isNew: true },
  { name: "Most Active Days", href: "/components/most-active-days-card", description: "Weekday bars linked to the rings.", tier: "pro", status: "shipped" },
  { name: "Radar Chart", href: "/components/radar-chart-card", description: "Filled, dotted, lines, and score radars.", tier: "pro", status: "shipped", isNew: true },
  { name: "Radial Chart", href: "/components/radial-chart-card", description: "Rings, gauges, and a stacked half gauge.", tier: "pro", status: "shipped", isNew: true },
  { name: "Line Chart", href: "/components/line-chart-card", description: "Curved or sharp line over a soft area.", tier: "pro", status: "shipped" },
  { name: "Sankey Chart", href: "/components/sankey-chart-card", description: "Flow diagram with tinted links and shares.", tier: "pro", status: "shipped", isNew: true },
  { name: "Scatter Chart", href: "/components/scatter-chart-card", description: "Correlation dots, bubbles when sized.", tier: "pro", status: "shipped", isNew: true },
  { name: "Sleep Score", href: "/components/sleep-score-card", description: "Radial gauge with score breakdown.", tier: "pro", status: "shipped" },
  { name: "Stage Bars", href: "/components/stage-bars-card", description: "Funnel stages as rounded horizontal pills.", tier: "pro", status: "shipped", isNew: true },
  { name: "Steps Chart", href: "/components/steps-card", description: "Daily steps with goal marker.", tier: "pro", status: "shipped" },
];

const templates: Entry[] = [
  { name: "Chat Starter", href: "/components/chat-starter", description: "Free, deployable chat on your own model key.", tier: "free", status: "shipped", isNew: true },
  { name: "AI Chat", href: "/components/ai-chat", description: "Full chat app with code panel and composer.", tier: "pro", status: "shipped" },
  { name: "AI Image Generation", href: "/components/ai-image-generation", description: "Prompt thread with generation frame and gallery panel.", tier: "pro", status: "shipped" },
  { name: "AI Profile", href: "/components/ai-profile", description: "Contributions profile with heatmap and charts.", tier: "pro", status: "shipped" },
  { name: "Finance Dashboard", href: "/components/finance-dashboard", description: "Cash-flow sankey, spending rings, and transactions table.", tier: "pro", status: "shipped", isNew: true },
  { name: "Home Dashboard", href: "/components/home-dashboard", description: "KPIs, revenue trend, and customers table.", tier: "pro", status: "shipped" },
  { name: "Marketing Dashboard", href: "/components/marketing-dashboard", description: "Acquisition funnel, spend charts, and campaigns table.", tier: "pro", status: "shipped", isNew: true },
  { name: "Medical Profile", href: "/components/medical-profile", description: "Patient overview with health charts.", tier: "pro", status: "shipped" },
];

/**
 * `wide` halves the column count: a template card shows a whole app screen,
 * which is unreadable at a third of the width.
 */
export const COMPONENT_SECTIONS: { title: string; blurb: string; entries: Entry[]; wide?: boolean }[] = [
  { title: "Foundations", blurb: "The tokens everything else is built on.", entries: foundations },
  { title: "Base", blurb: "The everyday building blocks.", entries: components },
  { title: "Blocks", blurb: "Larger assemblies, ready to drop in.", entries: blocks },
  { title: "Charts", blurb: "Data cards for dashboards.", entries: charts },
  { title: "Templates", blurb: "Complete screens, wired together.", entries: templates, wide: true },
];
