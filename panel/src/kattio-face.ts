/**
 * Kattio's face: the firmware's face engine (components/kattio_face) as WebAssembly, drawn on a canvas that fills
 * its place on the page. Tap the face to pet the cat.
 */
import type { Face, FaceFactory, FaceState } from "./face";

// The engine's moods (components/kattio_face/face_engine.h, enum Mood)
const MOOD = { BOOT: 0, IDLE: 1, LISTEN: 4, THINK: 5, SPEAK: 6, ERROR: 8 } as const;
const MOOD_OF: Record<FaceState, number> = {
  idle: MOOD.IDLE,
  listening: MOOD.LISTEN,
  thinking: MOOD.THINK,
  speaking: MOOD.SPEAK,
  error: MOOD.ERROR,
};

const FAST_FPS = 30; // while something moves fast
const SLOW_FPS = 12; // resting (blinks and breathing), like the box
const MAX_SCALE = 2; // device pixels per CSS pixel: sharper than this costs time and shows little
const MAX_SIDE = 1000; // canvas pixels, at most
const LEVEL_FALL = 6; // the voice level falls to nothing in about 1/6 s without new sound

interface Engine {
  memory: WebAssembly.Memory;
  _initialize(): void;
  face_init(seed: number): void;
  face_resize(w: number, h: number): number;
  face_set_mood(mood: number): void;
  face_get_mood(): number;
  face_set_level(level: number): void;
  face_poke(): number;
  face_update(dt: number): number;
  face_render(dark: number): void;
  face_glow(dark: number): number;
}

let engineModule: Promise<WebAssembly.Module> | undefined;

/** The wasm file sits next to this script (same version query, so a new version is not taken from a cache) */
function loadModule(): Promise<WebAssembly.Module> {
  if (!engineModule) {
    const here = new URL(import.meta.url);
    const url = new URL(`kattio-face.wasm${here.search}`, here);
    engineModule = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url.pathname}: HTTP ${res.status}`);
      return WebAssembly.compile(await res.arrayBuffer());
    })();
    engineModule.catch(() => (engineModule = undefined));
  }
  return engineModule;
}

async function instantiate(): Promise<Engine> {
  const module = await loadModule();
  let memory: WebAssembly.Memory | undefined;
  // The few system calls the C library may make: a clock, and no files
  const wasi = {
    clock_time_get: (_id: number, _precision: bigint, out: number) => {
      new DataView(memory!.buffer).setBigUint64(out, BigInt(Math.round(performance.now() * 1e6)), true);
      return 0;
    },
    fd_close: () => 8,
    fd_seek: () => 8,
    fd_write: () => 8,
  };
  const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi });
  const engine = instance.exports as unknown as Engine;
  memory = engine.memory;
  engine._initialize();
  engine.face_init((Math.random() * 0xffffffff) >>> 0 || 1);
  return engine;
}

/** Kattio's face, or `fallback` where WebAssembly can't run */
export function kattioFace(fallback: FaceFactory): FaceFactory {
  return (host) => {
    host.replaceChildren();
    const canvas = document.createElement("canvas");
    canvas.className = "face-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Kattio");
    host.append(canvas);
    const ctx = canvas.getContext("2d");

    let engine: Engine | undefined;
    let other: Face | undefined; // the fallback, if the engine could not load
    let destroyed = false;
    let state: FaceState = "idle";
    let dark = false;
    let glow = -1;
    let level = 0;
    let ptr = 0;
    let frame = 0;
    let lastTick = 0;
    let lastDraw = 0;
    let moving = true;

    const resize = () => {
      if (!engine) return;
      const box = host.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE);
      let w = Math.max(1, Math.round(box.width * scale));
      let h = Math.max(1, Math.round(box.height * scale));
      const shrink = Math.min(1, MAX_SIDE / Math.max(w, h));
      w = Math.max(1, Math.round(w * shrink));
      h = Math.max(1, Math.round(h * shrink));
      if (w === canvas.width && h === canvas.height && ptr) return;
      canvas.width = w;
      canvas.height = h;
      ptr = engine.face_resize(w, h);
      lastDraw = 0;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const draw = () => {
      if (!engine || !ctx || !ptr) return;
      engine.face_render(dark ? 1 : 0);
      // a fresh view each time: the engine's memory may have grown (and the old view gone)
      const pixels = new Uint8ClampedArray(engine.memory.buffer, ptr, canvas.width * canvas.height * 4);
      ctx.putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
      // the mood's colour as a soft glow behind the face (the page's own background around it)
      const colour = engine.face_glow(dark ? 1 : 0);
      if (colour !== glow) {
        glow = colour;
        host.style.setProperty("--face-glow", `#${colour.toString(16).padStart(6, "0")}`);
      }
    };

    const tick = (now: number) => {
      if (destroyed) return;
      frame = requestAnimationFrame(tick);
      if (!engine) return;
      const dt = lastTick ? Math.min((now - lastTick) / 1000, 0.25) : 0;
      lastTick = now;
      level = Math.max(0, level - LEVEL_FALL * dt * level - 0.02 * dt);
      engine.face_set_level(level);
      moving = engine.face_update(dt) !== 0 || moving;
      const every = 1000 / (moving || state === "speaking" ? FAST_FPS : SLOW_FPS);
      if (now - lastDraw >= every - 2) {
        lastDraw = now;
        draw();
        moving = false;
      }
    };

    const pet = () => {
      if (engine) {
        engine.face_poke();
        moving = true;
      }
    };
    canvas.addEventListener("click", pet);

    instantiate().then(
      (e) => {
        if (destroyed) return;
        engine = e;
        resize();
        // the cat wakes up (BOOT) first; a state set meanwhile takes over afterwards
        if (state !== "idle") engine.face_set_mood(MOOD_OF[state]);
        frame = requestAnimationFrame(tick);
      },
      (err) => {
        console.warn("Kattio face: could not load the face engine, showing a simpler one", err);
        if (destroyed) return;
        observer.disconnect();
        other = fallback(host);
        other.setState(state);
      },
    );

    return {
      setState(next) {
        if (other) return other.setState(next);
        const changed = next !== state;
        state = next;
        if (!engine || !changed) return;
        // don't cut the waking-up animation short just to rest
        if (next === "idle" && engine.face_get_mood() === MOOD.BOOT) return;
        engine.face_set_mood(MOOD_OF[next]);
        moving = true;
      },
      setLevel(value) {
        if (other) return other.setLevel(value);
        level = Math.max(level, Math.min(1, Math.max(0, value)));
      },
      setDark(value) {
        if (other) return other.setDark(value);
        if (value === dark) return;
        dark = value;
        glow = -1;
        lastDraw = 0;
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        canvas.removeEventListener("click", pet);
        other?.destroy();
        host.replaceChildren();
        host.style.removeProperty("--face-glow");
      },
    };
  };
}
