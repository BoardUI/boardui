import type { CSSProperties } from "react";
import { cx } from "@/utils/cx";

/**
 * Figma source: Board UI → "boardui_logo_pro" (node 4292:14213).
 *
 * The Pro badge drawn in the browser rather than exported as a PNG, so the
 * brushed-metal face stays crisp at any density and the mark itself is vector.
 *
 * The face is three stacked layers, in Figma's own order:
 *
 *   1. the metal      a conic gradient rotated by a matrix, over two linear
 *                     gradients. CSS has no rotated conic, so Figma emits the
 *                     conic inside an SVG `foreignObject` carrying the matrix
 *                     and uses that SVG as a background image. That data URI
 *                     is reproduced verbatim below.
 *   2. the shading    a soft-light gradient that dirties the highlights
 *   3. the grain      a noise tile at 10% overlay, repeating every 21×55px
 *
 * Then the mark: a grey plate and a white plate for the corner tab, and two
 * inlined vectors for the wordmark block, each keeping the inner-shadow and
 * drop-shadow filters Figma baked into them.
 *
 * Built at exactly 56px because every offset here is an absolute pixel value
 * taken from that frame. `scale` multiplies the whole thing rather than
 * rounding each offset independently, which is what keeps it 1:1.
 */

/**
 * The conic that gives the metal its sheen, kept on its own layer so it can be
 * rotated without dragging the base ramps around with it.
 */
const METAL_CONIC =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56' preserveAspectRatio='none'><g transform='matrix(0.30855 2.7916 -2.7916 0.30855 28.084 28.084)'><foreignObject x='-209.05' y='-209.05' width='418.1' height='418.1'><div xmlns='http://www.w3.org/1999/xhtml' style='background-image: conic-gradient(from 90deg, rgba(177, 179, 185, 0.79) -1.1694%, rgba(133, 138, 146, 0.8) 0.66824%, rgba(89, 96, 106, 0.81) 2.5059%, rgba(85, 91, 105, 0.81) 6.0639%, rgba(131, 134, 141, 0.815) 8.7859%, rgba(176, 176, 176, 0.82) 11.508%, rgba(136, 139, 146, 0.73) 14.502%, rgba(95, 101, 115, 0.64) 17.497%, rgba(132, 136, 147, 0.75) 20.285%, rgba(169, 171, 179, 0.86) 23.073%, rgba(182, 185, 192, 0.83) 33.451%, rgba(242, 243, 245, 0.81) 41.486%, rgba(206, 209, 213, 0.797) 44.026%, rgba(170, 175, 181, 0.785) 46.567%, rgba(134, 141, 148, 0.772) 49.108%, rgba(98, 107, 116, 0.76) 51.648%, rgba(120, 128, 137, 0.815) 56.221%, rgba(142, 149, 157, 0.87) 60.793%, rgba(191, 194, 199, 0.86) 64.438%, rgba(239, 239, 241, 0.85) 68.083%, rgba(206, 207, 211, 0.823) 69.767%, rgba(172, 176, 182, 0.795) 71.451%, rgba(139, 144, 152, 0.768) 73.135%, rgba(105, 112, 122, 0.74) 74.819%, rgba(87, 93, 107, 0.83) 78.813%, rgba(99, 106, 116, 0.8) 83.607%, rgba(135, 140, 148, 0.795) 86.112%, rgba(170, 174, 180, 0.79) 88.616%, rgba(241, 241, 243, 0.78) 93.624%, rgba(196, 198, 203, 0.755) 95.327%, rgba(151, 154, 163, 0.73) 97.03%, rgba(177, 179, 185, 0.79) 98.831%, rgba(133, 138, 146, 0.8) 100.67%, rgba(89, 96, 106, 0.81) 102.51%); opacity:1; height: 100%; width: 100%;'></div></foreignObject></g></svg>")`;

/** The two ramps the conic sits on. Static: these define which way the metal faces. */
const METAL_BASE =
  "linear-gradient(45.28920743596006deg, rgb(255, 255, 255) 6.9049%, rgb(221, 222, 226) 37.156%, rgb(238, 238, 238) 69.632%, rgb(216, 216, 216) 95.879%), " +
  "linear-gradient(219.75766341831996deg, rgb(232, 233, 237) 11.08%, rgb(214, 215, 219) 87.525%)";

const SOFT_LIGHT =
  "linear-gradient(49.14699952030495deg, rgba(7, 7, 7, 0.2) 0.21908%, rgba(216, 216, 216, 0.2) 3.5875%, rgba(53, 53, 53, 0.2) 3.5981%, rgba(56, 56, 56, 0.2) 21.225%, rgba(41, 41, 41, 0.2) 36.919%, rgba(180, 180, 180, 0.2) 66.954%, rgba(217, 217, 217, 0.2) 77.667%, rgba(50, 50, 50, 0.2) 89.8%, rgba(25, 25, 25, 0.2) 97.813%, rgba(53, 53, 53, 0.2) 97.824%, rgba(113, 113, 113, 0.2) 97.834%, rgba(18, 18, 18, 0.2) 105.62%)";

/** The frame this is drawn at; `scale` is measured against it. */
const BASE_SIZE = 56;

export function ProLogoMark({
  scale = 1,
  animated = true,
  className,
}: {
  /** Multiplies the 56px frame. `scale={0.5}` renders it at 28px. */
  scale?: number;
  /** Turns the sheen. Off at icon sizes, where the sweep only reads as noise. */
  animated?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cx("relative shrink-0", className)}
      style={{ width: BASE_SIZE * scale, height: BASE_SIZE * scale }}
    >
      <div
        className="relative rounded-[12.432px] shadow-[0px_0.896px_0.504px_0.336px_rgba(255,255,255,0.42),0px_-0.56px_1.221px_0.112px_rgba(0,0,0,0.21),0px_0.112px_0.582px_0.224px_rgba(56,56,56,0.25)]"
        style={
          {
            width: BASE_SIZE,
            height: BASE_SIZE,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          } as CSSProperties
        }
      >
        {/*
         * The clip lives here rather than on the parent, and is enforced with a
         * mask as well as `overflow-hidden`.
         *
         * An animated `transform` promotes the sheen to its own compositing
         * layer, and iOS WebKit then fails to clip that layer to a rounded
         * `overflow: hidden` box, so the circle spills past the badge corners.
         * Any mask on the container forces WebKit to clip descendants to the
         * padding box, corners included. Both gradients are fully opaque, so
         * they change nothing about what is drawn.
         *
         * It cannot go on the parent: a mask would clip the outer shadow away
         * with it.
         */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{
            WebkitMaskImage: "-webkit-radial-gradient(white, black)",
            maskImage: "linear-gradient(#000 0 0)",
          }}
        >
        {/* 1a. base metal, fixed */}
        <div className="absolute inset-0 rounded-[12.432px]" style={{ backgroundImage: METAL_BASE }} />
        {/* 1b. the sheen, turning. Oversized to 80px — the 56px face's diagonal
            is 79.2px, so a square that big still covers every corner at any
            angle, and the parent's `overflow-hidden` trims the rest. Without
            the extra size the corners would sweep into view as it turns. */}
        <div
          className={cx("absolute -inset-3 rounded-full", animated && "bui-metal-sweep")}
          style={{ backgroundImage: METAL_CONIC }}
        />
        {/* 2. shading */}
        <div
          className="absolute inset-0 rounded-[12.432px] mix-blend-soft-light"
          style={{ backgroundImage: SOFT_LIGHT }}
        />
        {/* 3. grain. Figma exports the full texture; it tiles at this size, so
            only one tile is stored. */}
        <div
          className="absolute inset-0 rounded-[12.432px] opacity-10 mix-blend-overlay"
          style={{
            backgroundImage: 'url("/brand/pro-logo-noise.webp")',
            backgroundSize: "21.43256351351738px 54.806126698851585px",
            backgroundPosition: "top left",
          }}
        />

        {/* Corner tab: a grey plate with the white one seated on top. */}
        <div className="absolute top-[3.34px] left-[2.63px] size-[16.32px] rounded-tl-[9.062px] rounded-tr-[3.766px] rounded-br-[3.531px] rounded-bl-[3.531px] bg-[rgba(133,133,136,0.69)] shadow-[inset_0px_0.336px_0.224px_0px_rgba(0,0,0,0.28)]" />
        <div className="absolute top-[4.15px] left-[3.32px] size-[14.933px] rounded-tl-[8.296px] rounded-tr-[3.319px] rounded-br-[3.319px] rounded-bl-[3.319px] bg-[rgba(255,255,255,0.8)] shadow-[0px_4.148px_4.148px_0px_rgba(0,0,0,0.03),0px_1.037px_1.037px_0px_rgba(0,0,0,0.11)]" />

        {/* Wordmark block, grey plate. Keeps Figma's two stacked inner shadows. */}
        <svg
          className="absolute top-[20.39px] left-[2.55px] block"
          width="50.8477"
          height="32.9277"
          viewBox="0 0 50.8477 32.9277"
          fill="none"
          preserveAspectRatio="none"
          overflow="visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#bui-pro-inner)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M41.7715 0C46.7842 3.26748e-05 50.8476 4.06344 50.8477 9.07617V22.9893C50.8475 28.4781 46.3981 32.9276 40.9092 32.9277H9.82715C4.39991 32.9277 0 28.5278 0 23.1006V4.01074C0 1.79568 1.79568 0 4.01074 0H41.7715ZM21.0234 9.23145C19.1174 9.23155 17.5723 10.7766 17.5723 12.6826V20.0352C17.5724 21.9411 19.1175 23.4862 21.0234 23.4863H28.9141C30.8201 23.4863 32.3651 21.9412 32.3652 20.0352V12.6826C32.3652 10.7765 30.8201 9.23145 28.9141 9.23145H21.0234Z"
              fill="#8B8B91"
            />
          </g>
          <defs>
            <filter
              id="bui-pro-inner"
              x="0"
              y="-0.112"
              width="50.8477"
              height="33.2637"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="0.224" />
              <feGaussianBlur stdDeviation="0.112" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0" />
              <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="-0.112" />
              <feGaussianBlur stdDeviation="0.168" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
              <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow" />
            </filter>
          </defs>
        </svg>

        {/* Wordmark block, white plate. Figma insets this one negatively so its
            drop shadows can spill past the box; the offsets below are that
            inset resolved against the 49.363×31.526 frame. */}
        <svg
          className="absolute top-[21.16px] left-[-0.827px] block"
          width="57.6596"
          height="39.8227"
          viewBox="0 0 57.6596 39.8227"
          fill="none"
          preserveAspectRatio="none"
          overflow="visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#bui-pro-drop)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M45.2146 0C49.7965 0 53.5114 3.71496 53.5114 8.29688V22.4004C53.5114 27.4404 49.4254 31.5262 44.3855 31.5264H13.2741C8.23401 31.5264 4.14815 27.4405 4.14815 22.4004V3.31934C4.14815 1.48659 5.63377 3.32397e-05 7.46651 0H45.2146ZM24.6189 8.74512C22.7863 8.74536 21.3005 10.2309 21.3005 12.0635V19.1338C21.3007 20.9662 22.7864 22.4519 24.6189 22.4521H32.2067C34.0392 22.452 35.5248 20.9663 35.5251 19.1338V12.0635C35.5251 10.2308 34.0394 8.74524 32.2067 8.74512H24.6189Z"
              fill="white"
              fillOpacity="0.9"
              shapeRendering="crispEdges"
            />
          </g>
          <defs>
            <filter
              id="bui-pro-drop"
              x="0"
              y="0"
              width="57.6596"
              height="39.8227"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="1.03704" />
              <feGaussianBlur stdDeviation="0.518519" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.11 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy="4.14815" />
              <feGaussianBlur stdDeviation="2.07407" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0" />
              <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            </filter>
          </defs>
        </svg>

        </div>

        {/* Inset rim, stacked over everything. Outside the clip so its own
            inset shadow is not masked. */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_0.336px_0.93px_0px_rgba(0,0,0,0.44),inset_0px_0.224px_0.515px_0.224px_rgba(89,89,89,0.25),inset_0px_-0.112px_1.154px_0.672px_rgba(118,118,118,0.38)]" />
      </div>
    </div>
  );
}
