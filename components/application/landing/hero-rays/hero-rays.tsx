"use client";

import { useEffect, useRef } from "react";
import {
  HERO_RAYS_COLOR_KEYS,
  HERO_RAYS_UNIFORM_KEYS,
  type HeroRaysConfig,
} from "./hero-rays-config";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./hero-rays-shader";

/**
 * WebGL canvas for the hero ray field.
 *
 * The config arrives as a prop but is read through a ref inside the render
 * loop: dragging a slider should repaint on the next frame without tearing
 * down the GL context or re-running the effect, and React state updates are
 * the wrong granularity for something already running at 60fps.
 */

const COLOR_KEYS = new Set<string>(HERO_RAYS_COLOR_KEYS);

/** `count` → `uCount`. Keeps config keys and uniform names in lockstep. */
function uniformName(key: string) {
  return `u${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  if (!Number.isFinite(int)) return [0, 0, 0];
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[hero-rays] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HeroRays({
  config,
  paused = false,
  className,
}: {
  config: HeroRaysConfig;
  paused?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  const pausedRef = useRef(paused);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      // A soft, slow light field — never worth spinning up a discrete GPU.
      powerPreference: "low-power",
    });

    // No WebGL means no background — the page reads fine without it, so this
    // fails quiet rather than throwing under a hero someone is trying to read.
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[hero-rays] program link failed:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // One triangle covering the viewport — a quad's worth of pixels with two
    // fewer vertices and no seam down the diagonal.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    for (const key of [...HERO_RAYS_UNIFORM_KEYS, "time"]) {
      const name = uniformName(key);
      locations.set(key, gl.getUniformLocation(program, name));
    }

    let width = 0;
    let height = 0;

    const resize = () => {
      // Half-resolution on hi-DPI screens: this is a soft, low-frequency
      // image, and the grain hides the difference — but the fill cost is
      // exactly the pixel count.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextWidth = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const nextHeight = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (nextWidth === width && nextHeight === height) return false;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      return true;
    };

    // Resizing the buffer clears it, so a resize seen here (not by the render
    // loop's own call) must drop `painted` — otherwise the paused/reduced-
    // motion path would skip the repaint and leave the band blank.
    const observer = new ResizeObserver(() => {
      if (resize()) painted = false;
    });
    observer.observe(canvas);
    resize();

    // Time is accumulated rather than read off the clock, so changing `speed`
    // (or pausing) bends the future without jumping the current frame.
    let shaderTime = 0;
    let lastFrame = performance.now();
    let frame = 0;

    // The loop only runs while the canvas can actually be seen. Scrolled past
    // or in a hidden tab, a ray field drawing at 60fps is pure heat — and this
    // component is mounted three times per landing page (hero + both
    // newsletter edges), so an unconditional loop triples itself.
    let onScreen = true;
    let running = false;

    // Soft light drifting slowly — half the frames paint the same picture.
    // 30fps is indistinguishable here and halves the fill cost.
    const FRAME_MS = 1000 / 30;
    let lastPaint = 0;
    let painted = false;

    const render = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(render);

      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;

      const delta = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;

      const current = configRef.current;
      if (!pausedRef.current) shaderTime += delta * current.speed;

      const resized = resize();

      // Reduced motion holds the field still — once it has been painted at
      // the current size, repainting the same pixels is pure waste.
      if (pausedRef.current && !resized && painted) return;
      painted = true;

      for (const key of HERO_RAYS_UNIFORM_KEYS) {
        const location = locations.get(key);
        if (!location) continue;
        if (COLOR_KEYS.has(key)) {
          const [r, g, b] = hexToRgb(String(current[key]));
          gl.uniform3f(location, r, g, b);
        } else {
          gl.uniform1f(location, Number(current[key]));
        }
      }
      const timeLocation = locations.get("time");
      if (timeLocation) gl.uniform1f(timeLocation, shaderTime);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const syncLoop = () => {
      const shouldRun = onScreen && document.visibilityState === "visible";
      if (shouldRun && !running) {
        running = true;
        // Resume from now — the field holds its pose while unseen instead of
        // banking up seconds of unseen animation and lurching to catch up.
        lastFrame = performance.now();
        lastPaint = 0;
        frame = requestAnimationFrame(render);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    };

    // A little early on both edges, so the light is already moving when the
    // canvas scrolls into view.
    const viewObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[entries.length - 1].isIntersecting;
        syncLoop();
      },
      { rootMargin: "160px 0px 160px 0px" },
    );
    viewObserver.observe(canvas);

    document.addEventListener("visibilitychange", syncLoop);
    syncLoop();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", syncLoop);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      // Only when the canvas is really going away. React re-runs this cleanup
      // and the effect against the *same* node (StrictMode's simulated
      // remount), and a context put away with `loseContext` can never be
      // re-acquired for that node — `getContext` hands back the dead one, and
      // the browser paints the canvas as a broken image. Checking
      // `isConnected` releases the context on a true unmount and leaves it
      // alone on a replay.
      if (!canvas.isConnected) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
