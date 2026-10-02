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

type Renderer = { invalidate: () => void; sync: (visible: boolean) => void; dispose: () => void };

/** Soft light needs far fewer pixels than text. Bound cost even on large Retina displays. */
function createRenderer(
  canvas: HTMLCanvasElement,
  readConfig: () => HeroRaysConfig,
  readPaused: () => boolean,
): Renderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: true, antialias: false,
    depth: false, stencil: false, powerPreference: "low-power",
  });
  if (!gl) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  const disposeProgram = () => {
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  };
  if (!vertex || !fragment || !program) { disposeProgram(); return null; }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { disposeProgram(); return null; }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const locations = new Map([...HERO_RAYS_UNIFORM_KEYS, "time"].map((key) =>
    [key, gl.getUniformLocation(program, uniformName(key))] as const,
  ));

  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const software = debug && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
  let still = !!software;
  let quality = software ? 0.5 : 1;
  let visible = false;
  let dirty = true;
  let painted = false;
  let sizeDirty = true;
  let uploaded: HeroRaysConfig | undefined;
  let frame = 0;
  let shaderTime = 0;
  let lastPaint = 0;
  let lastFrame = 0;
  let sampleTime = 0;
  let samples = 0;

  const schedule = () => {
    if (!frame && visible && (dirty || (!still && !readPaused()))) frame = requestAnimationFrame(render);
  };
  const invalidate = () => { dirty = true; schedule(); };
  const resize = () => {
    // Layout is read only after a ResizeObserver notification, never each frame.
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(1_000_000 / Math.max(1, cssWidth * cssHeight))) * quality;
    const width = Math.max(1, Math.floor(cssWidth * ratio));
    const height = Math.max(1, Math.floor(cssHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    sizeDirty = false;
  };
  const render = (now: number) => {
    frame = 0;
    if (!visible) return;
    // Sustained missed frames lower resolution once, then hold a still image.
    // This also handles drivers that do not expose a software-renderer name.
    if (lastFrame && !still && !readPaused()) {
      sampleTime += now - lastFrame;
      samples++;
      if (samples >= 24) {
        if (sampleTime / samples > 45) {
          if (quality > 0.5) { quality = 0.5; sizeDirty = true; }
          else still = true;
          dirty = true;
        }
        samples = 0;
        sampleTime = 0;
      }
    }
    lastFrame = now;
    if (dirty || now - lastPaint >= 1000 / 30 - 1) {
      const current = readConfig();
      if (!still && !readPaused() && lastPaint) shaderTime += Math.min((now - lastPaint) / 1000, 0.1) * current.speed;
      if (sizeDirty) resize();
      if (uploaded !== current) {
        for (const key of HERO_RAYS_UNIFORM_KEYS) {
          const location = locations.get(key);
          if (location == null) continue;
          if (COLOR_KEYS.has(key)) gl.uniform3f(location, ...hexToRgb(String(current[key])));
          else gl.uniform1f(location, Number(current[key]));
        }
        uploaded = current;
      }
      gl.uniform1f(locations.get("time") ?? null, shaderTime);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!painted) {
        painted = true;
        canvas.dataset.ready = "";
      }
      dirty = false;
      lastPaint = now;
    }
    schedule();
  };
  const observer = new ResizeObserver(() => { sizeDirty = true; invalidate(); });
  observer.observe(canvas);
  return {
    invalidate,
    sync(nextVisible) {
      if (visible !== nextVisible) {
        visible = nextVisible;
        lastPaint = 0;
        lastFrame = 0;
        samples = 0;
        sampleTime = 0;
      }
      if (!visible) { cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    },
    dispose() {
      visible = false;
      delete canvas.dataset.ready;
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      disposeProgram();
      // StrictMode replays effects on a connected canvas: keep that context reusable.
      if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export function HeroRays({ config, paused = false, priority = false, className }: {
  config: HeroRaysConfig;
  paused?: boolean;
  /** The above-fold hero starts next frame; offscreen decoration waits for idle. */
  priority?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  const pausedRef = useRef(paused);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    configRef.current = config;
    pausedRef.current = paused;
    // Theme, tuning and reduced-motion changes repaint even a static field.
    rendererRef.current?.invalidate();
  }, [config, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let near = false;
    let initialized = false;
    let idle: number | undefined;
    let timer: number | undefined;
    let startFrame: number | undefined;
    const cancelStart = () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
      if (startFrame !== undefined) cancelAnimationFrame(startFrame);
      idle = timer = startFrame = undefined;
    };
    const start = () => {
      idle = timer = startFrame = undefined;
      if (!near || document.visibilityState !== "visible") return;
      initialized = true;
      rendererRef.current = createRenderer(canvas, () => configRef.current, () => pausedRef.current);
      rendererRef.current?.sync(true);
    };
    const sync = () => {
      const visible = near && document.visibilityState === "visible";
      rendererRef.current?.sync(visible);
      if (!visible) cancelStart();
      else if (!initialized && idle === undefined && timer === undefined && startFrame === undefined) {
        // The hero already has a static first frame. Start its motion promptly,
        // while the newsletter still waits until it is nearby and the page is idle.
        if (priority) startFrame = requestAnimationFrame(start);
        else if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(start, { timeout: 800 });
        else timer = window.setTimeout(start, 100);
      }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      sync();
    }, { rootMargin: "160px 0px" });
    if (observer) observer.observe(canvas);
    else { near = true; sync(); }
    if (priority && observer) {
      const bounds = canvas.getBoundingClientRect();
      near = bounds.width > 0 && bounds.height > 0 && bounds.bottom > -160 && bounds.top < window.innerHeight + 160;
      sync();
    }
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelStart();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [priority]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
