import { useSyncExternalStore } from 'react';
import { EASE } from './motion';
import { COLOR_KEYS, NUM_KEYS, labsAt, mixLabs, rgbToHex, toPalette, type Lab, type NumKey, type Palette, type ColorKey } from './palette';

// The time of day the page is set to, and the colours that follow from it.
// One number, 0 (noon) to 1 (midnight), held here; every frame it changes the
// mixed palette is written to :root as CSS variables (RGB triplets, so
// Tailwind's opacity modifiers keep working). Two motions only: a sweep when
// the time is set from afar (a click on the dial, the command bar), and a
// short crossfade when the text flips at sunset. Neither runs under reduced
// motion. Midnight is the default, whatever the OS prefers.

const KEY = 'jf:time';
const BG_KEY = 'jf:time-bg'; // read by the inline script in index.html, before anything paints
export const DEFAULT_TIME = 1;

type Mix = { labs: Record<ColorKey, Lab>; nums: Record<NumKey, number> };

const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readStored(): number {
  try {
    const v = parseFloat(window.localStorage.getItem(KEY) ?? '');
    if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
  } catch {
    /* storage blocked: midnight */
  }
  return DEFAULT_TIME;
}

let pos = typeof window !== 'undefined' ? readStored() : DEFAULT_TIME;
let shown: Mix | null = null;
let palette: Palette = toPalette(labsAt(pos));
let side = palette.nums.ink > 0.5;
let flip: { from: Mix; t0: number } | null = null;
let sweep: { from: number; to: number; t0: number; dur: number } | null = null;
let raf = 0;
let saveTimer = 0;
const subs = new Set<() => void>();
const paints = new Set<(p: Palette) => void>();
const written: Record<string, string> = {};
let metaTheme: HTMLMetaElement | null = null;

const FLIP_MS = 420;
const bez = (t: number) => {
  // EASE.sweep as a cubic-bezier, solved by bisection: precise enough for colour
  const [x1, y1, x2, y2] = EASE.sweep;
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < t) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
};

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function set(name: string, value: string) {
  if (written[name] === value) return;
  written[name] = value;
  document.documentElement.style.setProperty(name, value);
}

function write(m: Mix) {
  palette = toPalette(m);
  for (const k of COLOR_KEYS) set(`--c-${kebab(k)}`, palette.colors[k].join(' '));
  for (const k of NUM_KEYS) set(`--${kebab(k)}`, palette.nums[k].toFixed(3));
  const dark = palette.nums.ink < 0.5;
  set('color-scheme', dark ? 'dark' : 'light');
  // how photographs of the night sit on the page: printed into paper by day, lit onto it after dark
  set('--blend', dark ? 'screen' : 'multiply');
  const bg = rgbToHex(palette.colors.void);
  if (written.meta !== bg) {
    written.meta = bg;
    metaTheme ??= document.querySelector('meta[name="theme-color"]');
    metaTheme?.setAttribute('content', bg);
  }
  paints.forEach((f) => f(palette));
}

function frame(now: number) {
  raf = 0;
  if (sweep) {
    const k = Math.min(1, (now - sweep.t0) / sweep.dur);
    pos = sweep.from + (sweep.to - sweep.from) * bez(k);
    if (k >= 1) sweep = null;
    subs.forEach((f) => f());
  }
  const target = labsAt(pos);
  const nextSide = target.nums.ink > 0.5;
  if (nextSide !== side) {
    side = nextSide;
    // crossing sunset: fade from whatever is on screen now to the other side
    if (shown && !reduce()) flip = { from: shown, t0: now };
  }
  if (flip) {
    const k = Math.min(1, (now - flip.t0) / FLIP_MS);
    shown = mixLabs(flip.from, target, bez(k));
    if (k >= 1) flip = null;
  } else shown = target;
  write(shown);
  if (sweep || flip) raf = requestAnimationFrame(frame);
}

const schedule = () => {
  if (!raf) raf = requestAnimationFrame(frame);
};

function persist(p: number) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(KEY, p.toFixed(4));
      window.localStorage.setItem(BG_KEY, rgbToHex(toPalette(labsAt(p)).colors.void));
    } catch {
      /* not remembered, still works */
    }
  }, 250);
}

/** Apply the stored (or default) time synchronously, before React renders. */
export function initTheme() {
  // index.html painted the stored background inline; from here the variables own it
  document.documentElement.style.removeProperty('background');
  shown = labsAt(pos);
  side = shown.nums.ink > 0.5;
  write(shown);
}

/**
 * Set the time of day. `sweep` glides there (the sun moving across), unless
 * the reader prefers reduced motion; otherwise it jumps, as when dragging.
 */
export function setTime(p: number, opts: { sweep?: boolean } = {}) {
  const to = Math.min(1, Math.max(0, p));
  if (opts.sweep && !reduce() && Math.abs(to - pos) > 0.004) {
    sweep = { from: pos, to, t0: performance.now(), dur: Math.min(1600, Math.max(380, Math.abs(to - pos) * 2200)) };
  } else {
    sweep = null;
    pos = to;
    subs.forEach((f) => f());
  }
  schedule();
  persist(to);
}

export const getTime = () => pos;
/** the palette currently on screen (mid-crossfade included) */
export const getPalette = () => palette;

function subscribe(f: () => void) {
  subs.add(f);
  return () => void subs.delete(f);
}

/** Called after each repaint of the theme, with the palette on screen. */
export function onPaint(f: (p: Palette) => void) {
  paints.add(f);
  return () => void paints.delete(f);
}

export const useTime = () => useSyncExternalStore(subscribe, getTime, () => DEFAULT_TIME);
