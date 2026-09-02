/**
 * GLSL for the hero ray field — vertical shafts of light that fade up, hold,
 * and fade out again, staggered so the field never resolves into a pattern.
 *
 * Written against WebGL 1 / GLSL ES 1.00 on purpose: it is a full-screen quad
 * with no extensions, no derivatives and no float textures, so it runs
 * everywhere including older Safari and low-end Android.
 *
 * The fragment shader loops over MAX_RAYS beams and accumulates each one's
 * contribution. Every beam derives its position, width, phase and color from
 * hashes of its index, so the whole field is described by a handful of
 * uniforms rather than any per-ray buffer — which is what makes it tunable
 * from a panel at 60fps.
 */

export const MAX_RAYS = 64;

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;

uniform float uCount;
uniform float uSpread;
uniform float uCenter;
uniform float uWidth;
uniform float uWidthVariance;
uniform float uSoftness;
uniform float uGlow;
uniform float uSeed;

uniform float uTop;
uniform float uLength;
uniform float uLengthVariance;
uniform float uFeatherTop;
uniform float uFeatherBottom;
uniform float uShape;
uniform float uTaper;
uniform float uEdgeFade;

uniform float uCycle;
uniform float uDuty;
uniform float uFade;
uniform float uStagger;
uniform float uSway;
uniform float uSwaySpeed;
uniform float uShimmer;
uniform float uShimmerSpeed;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;
uniform vec3  uBackground;
uniform float uBackgroundAlpha;
uniform float uIntensity;
uniform float uExposure;
uniform float uInk;
uniform float uGrain;

const int MAX_RAYS = ${MAX_RAYS};
const float TAU = 6.2831853;

// Cheap, stable hashes. Every per-ray property comes from these, so the same
// seed always produces the same field — reloading the page does not reshuffle
// a composition you just spent ten minutes tuning.
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// A → B → C ramp, so three pickers cover a gradient rather than three stripes.
vec3 rampColor(float t) {
  return t < 0.5 ? mix(uColorA, uColorB, t * 2.0) : mix(uColorB, uColorC, (t - 0.5) * 2.0);
}

void main() {
  float x = vUv.x;
  // Flip so y = 0 is the top edge: every "start"/"length" control reads
  // top-down, matching how the band sits on the page.
  float y = 1.0 - vUv.y;

  vec3 light = vec3(0.0);
  float coverage = 0.0;

  for (int i = 0; i < MAX_RAYS; i++) {
    if (float(i) >= uCount) break;

    float fi = float(i) + uSeed * 7.13;
    float hx = hash11(fi * 1.13 + 0.7);
    float hw = hash11(fi * 2.71 + 5.3);
    float hp = hash11(fi * 3.37 + 11.1);
    float hc = hash11(fi * 4.91 + 17.9);
    float hl = hash11(fi * 6.19 + 23.3);
    float hs = hash11(fi * 7.53 + 29.7);

    // Life cycle. Each beam runs its own copy of the same envelope, offset by
    // its phase hash: rise over uFade, hold, fall over uFade, then sit dark
    // for whatever share of the cycle uDuty leaves over.
    float phase = fract(uTime / max(uCycle, 0.01) + hp * uStagger + float(i) * 0.0137);
    float lit = phase / max(uDuty, 0.001);
    if (lit > 1.0) continue;

    float fade = clamp(uFade, 0.001, 0.5);
    float env = smoothstep(0.0, fade, lit) * (1.0 - smoothstep(1.0 - fade, 1.0, lit));
    if (env <= 0.0) continue;

    // Vertical extent, evaluated before the horizontal profile so beams that
    // do not reach this row cost nothing more.
    float len = max(uLength * (1.0 - uLengthVariance * hl), 0.001);
    float along = (y - uTop) / len;
    float mask =
      smoothstep(0.0, max(uFeatherTop, 0.0005), along) *
      (1.0 - smoothstep(1.0 - max(uFeatherBottom, 0.0005), 1.0, along));
    if (mask <= 0.0) continue;
    mask = pow(mask, uShape);

    float center = uCenter + (hx - 0.5) * uSpread;
    center += sin(uTime * uSwaySpeed * (0.4 + hs) + hp * TAU) * uSway;

    // Width varies per beam and again along its length, which is what turns a
    // rectangle into a shaft of light.
    float width = uWidth * (1.0 + (hw - 0.5) * 2.0 * uWidthVariance);
    width *= mix(1.0, uTaper, clamp(along, 0.0, 1.0));
    width = max(width, 0.0002);

    float dx = (x - center) / width;
    float d2 = dx * dx;
    // Two gaussians: a tight core for the beam, a very wide one for the bloom
    // around it. Summing them is far cheaper than an actual blur pass.
    float core = exp(-d2 * (1.0 + uSoftness * 8.0));
    float halo = exp(-d2 * 0.22) * uGlow;

    float shimmer = 1.0 + uShimmer * sin(along * 14.0 - uTime * uShimmerSpeed * 4.0 + hp * TAU);

    float amount = (core + halo) * mask * env * max(shimmer, 0.0);
    light += rampColor(hc) * amount;
    // The same accumulation without colour: how much beam covers this pixel,
    // which is what the paint path needs (see uInk below).
    coverage += amount;
  }

  float edge = max(uEdgeFade, 0.0005);
  float edgeMask = smoothstep(0.0, edge, x) * (1.0 - smoothstep(1.0 - edge, 1.0, x));
  light *= edgeMask;
  coverage *= edgeMask;

  // Tone map, so pushing intensity blooms toward white instead of clipping
  // each channel independently into neon.
  vec3 color = vec3(1.0) - exp(-light * uIntensity * uExposure);
  float lightAlpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);

  // Paint path. Additively, a beam only ever *adds* light: grey barely shows
  // against a pale background and black shows not at all, which rules out the
  // whole silver end of the palette. Here the beam's own colour is laid over
  // the background with its coverage as alpha instead, so any colour reads —
  // and a silver ramp comes out as brushed metal rather than nothing.
  float ink = clamp(uInk, 0.0, 1.0);
  vec3 premultipliedRay = color;
  float rayAlpha = lightAlpha;
  if (ink > 0.0) {
    float cov = clamp(coverage * uIntensity * uExposure, 0.0, 1.0);
    // light is colour x coverage, so dividing gives the beam colour back.
    vec3 paint = coverage > 0.0001 ? light / coverage : vec3(0.0);
    premultipliedRay = mix(color, paint * cov, ink);
    rayAlpha = mix(lightAlpha, cov, ink);
  }
  color = premultipliedRay;
  float bgAlpha = clamp(uBackgroundAlpha, 0.0, 1.0) * (1.0 - rayAlpha);

  vec3 premultiplied = color + uBackground * bgAlpha;
  float alpha = rayAlpha + bgAlpha;

  // Dither. These gradients are almost entirely low-frequency, which is
  // exactly where 8-bit banding shows up as visible steps.
  float noise = hash21(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5;
  premultiplied += noise * uGrain;
  alpha += noise * uGrain * 0.5;

  gl_FragColor = vec4(clamp(premultiplied, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;
