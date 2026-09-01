"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/utils/cx";

/**
 * The "Current plan" artwork (settings-plan-art.png) rendered through a WebGL
 * fragment shader as a burning, wind-torn flag:
 *
 *   wave   the image UVs ripple with two crossed sine waves plus low-freq
 *          fbm turbulence, amplitude growing toward the edges — center stays
 *          pinned like a flag on a pole, edges flap.
 *   burn   a slow-drifting fbm field is thresholded against an edge-weighted,
 *          breathing burn level: past the threshold the cloth is gone (alpha
 *          holes), just before it a hot ember rim glows orange→yellow, and
 *          just inside that the fabric chars dark.
 *   sparks tiny embers detach from burning regions and drift up-right,
 *          flickering out.
 *
 * Same raw-WebGL recipe as the effort slider's FlameOverlay (ai-chat-menus):
 * fullscreen quad, rAF loop, and a plain <img> fallback when a context can't
 * be created. The radial fade into the card bg stays as a DOM overlay above.
 */

const VERT = /* glsl */ `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_time;
uniform vec2 u_mouse;      // pointer in UV space (y up)
uniform float u_mouseStr;  // 0..1, eased in JS
varying vec2 v_uv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;

  // 0 at the center, 1 at the corners — drives both flap amplitude and burn.
  float edge = clamp(distance(uv, vec2(0.5)) * 1.6, 0.0, 1.0);

  // Pointer heat: a soft hotspot under the cursor that stokes the burn and
  // agitates the cloth around it.
  float mouseBoost = u_mouseStr * smoothstep(0.2, 0.02, distance(v_uv, u_mouse));

  // Flag-in-wind: crossed sines + a pinch of turbulence, pinned at center.
  float amp = 0.004 + 0.022 * edge * edge + 0.012 * mouseBoost;
  uv.x += sin(uv.y * 9.0 + u_time * 2.2) * amp;
  uv.y += sin(uv.x * 12.0 - u_time * 2.7) * amp * 0.85;
  uv += (vec2(
    fbm(v_uv * 3.0 + vec2(u_time * 0.35, 0.0)),
    fbm(v_uv * 3.0 + vec2(0.0, u_time * 0.31) + 31.7)
  ) - 0.5) * 0.03 * edge;

  vec4 img = texture2D(u_tex, uv);

  // Burn field: drifting noise vs an edge-weighted, breathing threshold —
  // the pointer hotspot raises the local burn level on top.
  float n = fbm(uv * 4.5 + vec2(u_time * 0.3, -u_time * 0.48));
  float breathe = 0.78 + 0.22 * sin(u_time * 1.1 + n * 7.0);
  float burn = min(edge * breathe * 0.85 + mouseBoost * 0.45, 1.05);
  float d = n - (1.0 - burn); // > 0 → consumed

  float hole = smoothstep(0.0, 0.07, d);
  float rim = smoothstep(-0.11, 0.0, d) * (1.0 - hole);
  float charr = smoothstep(-0.26, -0.08, d) * (1.0 - rim) * (1.0 - hole);

  // Ember rim: deep orange at the outside, white-yellow right at the tear.
  float hot = smoothstep(-0.05, 0.0, d);
  vec3 ember = mix(vec3(1.0, 0.38, 0.08), vec3(1.0, 0.85, 0.35), hot);

  vec3 col = img.rgb;
  col = mix(col, col * vec3(0.32, 0.24, 0.22), charr * 0.75); // char darkening
  col = mix(col, ember, rim);
  col += ember * rim * 0.6; // rim over-glow

  float alpha = img.a * (1.0 - hole);

  // Burning paper flakes: three parallax layers of small rotated slivers
  // that drift up-right while tumbling. Each has its own life cycle —
  // ignites bright yellow-white, cools to orange, then dies out — and they
  // only spawn near burning fabric (or under the pointer's hotspot).
  float gate = smoothstep(0.12, 0.5, edge * breathe) + mouseBoost;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 13.0 + fi * 8.0;
    vec2 sp = v_uv * scale + vec2(-u_time * (0.8 + fi * 0.5), -u_time * (2.0 + fi * 1.1));
    vec2 cell = floor(sp);
    float sh = hash(cell + fi * 13.7);
    if (sh > 0.7) {
      vec2 pos = 0.2 + 0.6 * vec2(hash(cell + 3.1), hash(cell + 7.7));
      // Tumbling sway while it floats
      pos.x += sin(u_time * (2.0 + sh * 3.0) + sh * 20.0) * 0.08;
      vec2 delta = fract(sp) - pos;
      // Rotated, elongated sliver — reads as a torn paper fragment.
      float angle = sh * 6.2831 + u_time * (1.2 + sh * 2.0);
      vec2 r = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * delta;
      float body = smoothstep(0.17, 0.03, length(r * vec2(1.0, 2.6)));
      // Life cycle: quick ignite → glow → burn out and vanish.
      float life = fract(u_time * (0.35 + sh * 0.5) + sh * 11.0);
      float glow = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.5, 0.95, life));
      float flicker = 0.75 + 0.25 * sin(u_time * 11.0 + sh * 40.0);
      vec3 flakeCol = mix(vec3(1.0, 0.4, 0.07), vec3(1.0, 0.93, 0.55), glow * flicker);
      float lum = body * glow * flicker * min(gate, 1.2);
      col += flakeCol * lum;
      alpha = max(alpha, lum * 0.95);
    }
  }

  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Paints the built-in artwork — the three token-coloured blobs — into an
 * offscreen canvas so the shader has something to burn when no `src` is given.
 *
 * Exists so the component animates on its own: a CLI install ships no image,
 * and a static gradient in place of the flame made the packaged component look
 * like a different thing from the one in the templates. Colours are read from
 * the live custom properties rather than hardcoded, so it follows the theme.
 */
function paintFallbackArt(size: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  // Soft-edged discs, matching the DOM fallback's positions and 70% alpha.
  // A radial gradient rather than ctx.filter = blur(): Safari leaves the
  // filter unimplemented on some versions, and a hard disc would read as a
  // pasted circle instead of a glow.
  const blob = (cx: number, cy: number, r: number, color: string) => {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.fillStyle = token("--color-background-tertiary-default", "#ebebeb");
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.7;
  blob(size * 0.125, size * 0.125, size * 0.42, token("--color-blue-400", "#3392ff"));
  blob(size * 0.83, size * 0.58, size * 0.38, token("--color-lime-400", "#9ae600"));
  blob(size * 0.5, size * 0.95, size * 0.42, token("--color-orange-400", "#ff8904"));
  ctx.globalAlpha = 1;

  return canvas;
}

export function PlanArtFlame({ src, className }: { src?: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uMouseStr = gl.getUniformLocation(program, "u_mouseStr");
    gl.uniform1i(gl.getUniformLocation(program, "u_tex"), 0);

    // Pointer tracked on window (overlays sit above the canvas, so listening
    // on the canvas itself would never fire); eased per-frame in the loop.
    const target = { x: 0.5, y: 0.5, str: 0 };
    const eased = { x: 0.5, y: 0.5, str: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height; // GL y-up
      const inside = x > -0.15 && x < 1.15 && y > -0.15 && y < 1.15;
      if (inside) {
        target.x = x;
        target.y = y;
      }
      target.str = inside ? 1 : 0;
    };
    window.addEventListener("pointermove", onPointerMove);

    // NPOT-safe texture params (no mipmaps, clamp, linear).
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf = 0;
    let disposed = false;
    const start = performance.now();
    const draw = (now: number) => {
      gl.uniform1f(uTime, (now - start) / 1000);
      // Ease the pointer hotspot so the heat trails the cursor smoothly.
      eased.x += (target.x - eased.x) * 0.12;
      eased.y += (target.y - eased.y) * 0.12;
      eased.str += (target.str - eased.str) * 0.07;
      gl.uniform2f(uMouse, eased.x, eased.y);
      gl.uniform1f(uMouseStr, eased.str);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };

    const upload = (source: TexImageSource) => {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      raf = requestAnimationFrame(draw);
    };

    if (src) {
      const image = new Image();
      image.onload = () => {
        if (disposed) return;
        upload(image);
      };
      image.onerror = () => setFailed(true);
      image.src = src;
    } else {
      // No artwork supplied: burn the built-in blobs instead of falling back
      // to a static gradient.
      const art = paintFallbackArt(512);
      if (!art) {
        setFailed(true);
        return;
      }
      upload(art);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [src]);

  // Only when WebGL itself is unavailable: with no `src` the shader now runs
  // on generated artwork, so this is the no-context / broken-image path.
  if (failed) {
    return (
      <div
        aria-hidden
        className={cx(
          "relative overflow-hidden bg-background-tertiary-default",
          className,
        )}
      >
        <span className="absolute -top-1/4 -left-1/4 size-3/4 rounded-full bg-blue-400/70 blur-2xl" />
        <span className="absolute top-1/4 right-0 size-2/3 rounded-full bg-lime-400/70 blur-2xl" />
        <span className="absolute right-1/4 -bottom-1/4 size-3/4 rounded-full bg-orange-400/70 blur-2xl" />
      </div>
    );
  }
  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
