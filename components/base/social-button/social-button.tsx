import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cx, sortCx } from "@/utils/cx";
import { SOCIAL_COLOR_LOGOS } from "@/components/base/social-button/social-color-logos";
import {
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "@/components/base/social-button/social-providers";

/**
 * Sign-in button for a third-party provider — 24 of them, from Google and
 * Apple through to Okta and Auth0, plus `custom` for anything else.
 *
 * The brand is named, not passed as artwork: `brand="google"` supplies the
 * logo, the brand colour and the accessible label together, so a stack of
 * these cannot drift out of sync.
 *
 *   <SocialButton brand="google" />                       Continue with Google
 *   <SocialButton brand="github" appearance="white" />    outlined, colour mark
 *   <SocialButton brand="apple" iconOnly />               square, logo only
 *   <SocialButton brand="figma" href="/auth/figma" />     renders an anchor
 *
 * Three appearances. `colorful` (default) fills with the brand colour and
 * puts a white glyph on it. `black` is the same shape in high-contrast solid
 * black. `white` is the outlined treatment, and the one that shows each
 * provider's real multi-colour mark, which is what most sign-in screens use.
 *
 * One rounding, deliberately: a sign-in stack reads as a set, and mixing pill
 * and square corners across providers is noise rather than expression.
 */

export type SocialBrand = SocialProvider | "custom";
export type SocialButtonSize = "medium" | "small";
export type SocialButtonAppearance = "colorful" | "black" | "white";

/** Everything a brand needs, for providers that are not built in. */
export interface SocialBrandConfig {
  icon: ReactNode;
  /** Used in the label and as the accessible name. Defaults to "SSO". */
  label?: string;
  /** Fill for `colorful`. Defaults to black. */
  color?: string;
}

interface SocialButtonBaseProps {
  brand: SocialBrand;
  /** Required when `brand="custom"`; ignored otherwise. */
  config?: SocialBrandConfig;
  size?: SocialButtonSize;
  appearance?: SocialButtonAppearance;
  /** Square button showing only the logo; the label becomes the aria-label. */
  iconOnly?: boolean;
  /** Drop the fixed width and fill the container instead. */
  fullWidth?: boolean;
  /** Defaults to "Continue with <Brand>". */
  children?: ReactNode;
  className?: string;
}

export interface SocialButtonProps
  extends SocialButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color"> {
  href?: never;
  ref?: Ref<HTMLButtonElement>;
}

export interface SocialButtonLinkProps
  extends SocialButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "color"> {
  /** Renders an anchor instead of a button — OAuth starts are navigations. */
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * Brands whose real mark is drawn in near-black. On a dark surface they
 * disappear into it, so dark mode repaints their paths white — the official
 * treatment both publish for dark backgrounds. Colourful marks (Google,
 * Slack) are left exactly as drawn.
 */
const DARK_INVERTED_BRANDS = new Set<SocialBrand>(["apple", "github", "x"]);

const styles = sortCx({
  base: [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden",
    "font-sans select-none cursor-pointer",
    "button-press-motion",
    "transition-[background-color,border-color,box-shadow,color,filter] duration-150 ease",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
  ].join(" "),
  // Heights, radii and glyph sizes are the base Button's medium and small to
  // the pixel, so a social button can sit in a form beside a Button without
  // a half-step in the rhythm. The fixed width is the one addition: a column
  // of providers should line up without a wrapper doing the work, and
  // `fullWidth` opts out.
  size: {
    medium: "h-9 w-[300px] rounded-2lg px-3 text-body-medium",
    small: "h-8 w-[250px] rounded-lg px-2.5 text-body-medium",
  },
  iconOnlySize: {
    medium: "size-9 w-9 rounded-2lg px-0",
    small: "size-8 w-8 rounded-lg px-0",
  },
  // A touch under the base Button's icon sizes (20/18): a brand mark is
  // denser than a line icon and reads heavier at the same box.
  glyph: {
    medium: "size-[18px] shrink-0",
    small: "size-4 shrink-0",
  },
  appearance: {
    // The same recipe as `bg-button-primary`: a 180deg gradient from the
    // brand colour into a darker stop, with the system's own button shadow.
    // A flat fill read as a foreign control next to BoardUI's own buttons.
    // The gradient itself is set inline, since it is per-brand.
    colorful: "text-white shadow-xs",
    black:
      "bg-neutral-950 text-white shadow-xs hover:bg-neutral-800 active:bg-neutral-900",
    // Matches the system's secondary button, so it sits in a form beside the
    // rest of BoardUI without looking like a different family.
    white: [
      "bg-background-primary-default text-text-primary",
      "border border-border-button-default shadow-xs",
      "hover:bg-background-primary-hover hover:border-border-button-hover",
      "active:bg-background-primary-active active:border-border-button-active",
    ].join(" "),
  },
});

export function SocialButton({ href, ...props }: SocialButtonProps | SocialButtonLinkProps) {
  const {
    brand,
    config,
    size = "medium",
    appearance = "colorful",
    iconOnly = false,
    fullWidth = false,
    children,
    className,
    ref,
    ...rest
  } = props as SocialButtonBaseProps & {
    ref?: Ref<HTMLButtonElement & HTMLAnchorElement>;
  } & Record<string, unknown>;

  const custom = brand === "custom";
  const meta = custom ? undefined : SOCIAL_PROVIDERS[brand as SocialProvider];
  const label = custom ? (config?.label ?? "SSO") : meta!.label;
  const fill = custom ? (config?.color ?? "#000000") : meta!.brand;

  // The outlined treatment is where the real multi-colour mark belongs: on a
  // brand or black fill it would fight the background. Not every provider has
  // one upstream (see social-color-logos.ts), so a missing mark falls back to
  // the monochrome glyph tinted with the brand colour.
  const colorLogo =
    appearance === "white" && !custom
      ? SOCIAL_COLOR_LOGOS[brand as SocialProvider]
      : undefined;

  const glyph = custom ? (
    <span className={cx(styles.glyph[size], "inline-flex items-center justify-center")}>
      {config?.icon}
    </span>
  ) : colorLogo ? (
    <svg
      viewBox={colorLogo.viewBox}
      aria-hidden
      className={cx(
        styles.glyph[size],
        DARK_INVERTED_BRANDS.has(brand) && "dark:[&_path]:fill-white",
      )}
      // The mark carries its own fills, so it goes in as markup. This is a
      // build-time constant from this repo, never caller- or user-supplied.
      dangerouslySetInnerHTML={{ __html: colorLogo.body }}
    />
  ) : (
    <svg
      viewBox={meta!.viewBox}
      aria-hidden
      className={styles.glyph[size]}
      // On the filled appearances the glyph rides the white label; outlined
      // falls back to the brand colour so it is not a grey smudge.
      style={appearance === "white" ? { color: meta!.brand } : undefined}
    >
      <path d={meta!.path} fill="currentColor" />
    </svg>
  );

  const content = (
    <>
      {glyph}
      {iconOnly ? null : <span className="truncate">{children ?? `Continue with ${label}`}</span>}
    </>
  );

  // A brand whose colour is a system token (Google) hands the fill straight
  // to `bg-button-primary`, so it is the primary button, gradient, hover and
  // active included, rather than an approximation of it. Every other brand
  // gets that gradient's shape derived from its own colour: down in
  // lightness and up slightly in chroma, which is what blue-500 → blue-600
  // does. Mixing toward black instead would wash the second stop out.
  const systemFill = appearance === "colorful" && fill.startsWith("var(");

  const classes = cx(
    styles.base,
    iconOnly ? styles.iconOnlySize[size] : styles.size[size],
    styles.appearance[appearance],
    // `bg-button-primary` carries its own hover and active gradients; the
    // derived brands need the brightness shift instead.
    systemFill
      ? "bg-button-primary"
      : appearance === "colorful" && "hover:brightness-[1.06] active:brightness-95",
    fullWidth && !iconOnly && "w-full",
    className,
  );

  // The visible label already names the brand; when it is hidden the element
  // needs that name back, or the control announces as unlabelled.
  const accessibleName = iconOnly ? `Continue with ${label}` : undefined;

  const inlineStyle =
    appearance === "colorful" && !systemFill
      ? {
          backgroundImage: `linear-gradient(180deg, ${fill} 0%, oklch(from ${fill} calc(l - 0.04) calc(c + 0.01) h) 100%)`,
        }
      : undefined;

  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        aria-label={accessibleName}
        className={classes}
        style={inlineStyle}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      aria-label={accessibleName}
      className={classes}
      style={inlineStyle}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}

export { SOCIAL_PROVIDERS, type SocialProvider };
