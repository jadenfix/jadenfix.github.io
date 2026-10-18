import { useEffect, useRef, type RefObject } from 'react';

/** the same 1px-track, square-thumb range input OrbitLab uses */
export const RANGE =
  'block h-5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none ' +
  '[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-[#34322e] ' +
  '[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px] [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-phos [&::-webkit-slider-thumb]:bg-void ' +
  '[&::-moz-range-track]:h-px [&::-moz-range-track]:bg-[#34322e] ' +
  '[&::-moz-range-thumb]:h-[9px] [&::-moz-range-thumb]:w-[9px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-phos [&::-moz-range-thumb]:bg-void ' +
  'focus-visible:[&::-webkit-slider-thumb]:bg-phos focus-visible:[&::-moz-range-thumb]:bg-phos';

export const TOGGLE =
  'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

export const STAGE = 'relative aspect-square w-full overflow-hidden border border-line bg-void sm:aspect-[16/10]';

export type Size = { w: number; h: number; dpr: number };

/**
 * Keeps a crisp main canvas and a half-resolution glow canvas (blurred by CSS and
 * screen-blended over it) sized to their box, and an offscreen layer the
 * luminous parts are drawn into once and then copied to both.
 */
export function useStageCanvases(onResize: () => void): {
  boxRef: RefObject<HTMLDivElement | null>;
  mainRef: RefObject<HTMLCanvasElement | null>;
  glowRef: RefObject<HTMLCanvasElement | null>;
  size: RefObject<Size>;
  layer: RefObject<HTMLCanvasElement | null>;
} {
  const boxRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLCanvasElement | null>(null);
  const size = useRef<Size>({ w: 0, h: 0, dpr: 1 });
  const cb = useRef(onResize);
  useEffect(() => {
    cb.current = onResize;
  });
  useEffect(() => {
    const box = boxRef.current;
    const main = mainRef.current;
    const glow = glowRef.current;
    if (!box || !main || !glow) return;
    if (!layer.current) layer.current = document.createElement('canvas');
    const fit = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      main.width = Math.max(1, Math.round(r.width * dpr));
      main.height = Math.max(1, Math.round(r.height * dpr));
      glow.width = Math.max(1, Math.round(r.width * 0.5));
      glow.height = Math.max(1, Math.round(r.height * 0.5));
      if (layer.current) {
        layer.current.width = main.width;
        layer.current.height = main.height;
      }
      size.current = { w: r.width, h: r.height, dpr };
      cb.current();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  return { boxRef, mainRef, glowRef, size, layer };
}

/** requestAnimationFrame loop with a capped wall-clock step, only while `on` */
export function useLoop(on: boolean, tick: (dt: number, now: number) => void) {
  const cb = useRef(tick);
  useEffect(() => {
    cb.current = tick;
  });
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      cb.current(dt, now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/** copy the luminous layer onto the main canvas (additively) and into the glow canvas */
export function compositeGlow(main: HTMLCanvasElement, glow: HTMLCanvasElement, layer: HTMLCanvasElement) {
  const m = main.getContext('2d');
  const g = glow.getContext('2d');
  if (!m || !g) return;
  m.save();
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.globalCompositeOperation = 'lighter';
  m.drawImage(layer, 0, 0);
  m.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, glow.width, glow.height);
  g.drawImage(layer, 0, 0, glow.width, glow.height);
}

export const fmt = (v: number, digits = 3) => {
  if (!Number.isFinite(v)) return '∞';
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(Math.max(0, digits - 2));
  if (a >= 1) return v.toFixed(Math.max(0, digits - 1));
  return v.toPrecision(digits);
};

/** seconds, as s or min, for readouts */
export const fmtTime = (s: number) => (s >= 120 ? `${fmt(s / 60)} min` : s >= 1 ? `${fmt(s)} s` : `${fmt(s * 1000)} ms`);
