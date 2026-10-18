import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

const RM = '(prefers-reduced-motion: reduce)';

function subscribeReduced(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(RM);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** true when the visitor asked the OS for less motion */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(RM).matches : false),
    () => false,
  );
}

/** whether the element is on screen right now, and whether it ever has been */
export function useOnScreen(ref: RefObject<Element | null>, rootMargin = '0px'): { visible: boolean; seen: boolean } {
  const [state, setState] = useState({ visible: false, seen: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const id = window.setTimeout(() => setState({ visible: true, seen: true }), 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => setState((s) => ({ visible: entry.isIntersecting, seen: s.seen || entry.isIntersecting })),
      { rootMargin, threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return state;
}

/** the value, held back until it has stopped changing for `ms` (keeps slider drags smooth while a solve runs) */
export function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/**
 * Size a canvas to its box at device resolution and repaint on resize.
 * `paint` receives a context already scaled to CSS pixels.
 */
export function useCanvas(
  boxRef: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): () => void {
  const paintRef = useRef(paint);
  const size = useRef({ w: 0, h: 0 });
  useEffect(() => {
    paintRef.current = paint;
  });
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    const { w, h } = size.current;
    if (!c || !ctx || !w || !h) return;
    const dpr = c.width / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintRef.current(ctx, w, h);
  }, [canvasRef]);
  useEffect(() => {
    const box = boxRef.current;
    const c = canvasRef.current;
    if (!box || !c) return;
    const fit = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      size.current = { w: r.width, h: r.height };
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [boxRef, canvasRef, redraw]);
  return redraw;
}
