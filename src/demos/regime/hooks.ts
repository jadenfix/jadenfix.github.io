import { useEffect, useRef, useState, type RefObject } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** Whether the element is on screen, and whether it has ever been. */
export function useVisibility(ref: RefObject<Element | null>, margin = '0px'): { visible: boolean; seen: boolean } {
  const [state, setState] = useState({ visible: false, seen: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setState((s) => ({ visible: entry.isIntersecting, seen: s.seen || entry.isIntersecting })),
      { rootMargin: margin, threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return state;
}

export function useSize(ref: RefObject<Element | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize((s) => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Tween a numeric vector toward `target` over `duration` ms. When `animate` is false the
 * value snaps on the next frame, so nothing runs while the demo is offscreen or when the
 * reader prefers reduced motion.
 */
export function useTween(target: readonly number[], duration: number, animate: boolean): number[] {
  const [value, setValue] = useState<number[]>(() => [...target]);
  const current = useRef<number[]>([...target]);
  const key = target.join(',');
  useEffect(() => {
    const to = key.split(',').map(Number);
    const from = [...current.current];
    const ms = animate ? duration : 0;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
      const e = easeInOut(t);
      const next = to.map((v, i) => (from[i] ?? v) + (v - (from[i] ?? v)) * e);
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key, duration, animate]);
  return value;
}

/**
 * One-shot eased 0 to 1 progress. Advances only while `running` is true, so a reveal that
 * scrolls offscreen halfway pauses and resumes where it stopped.
 */
export function useReveal(running: boolean, duration: number, reduce: boolean): number {
  const [p, setP] = useState(0);
  const linear = useRef(0);
  useEffect(() => {
    if (!running || linear.current >= 1) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      linear.current = reduce ? 1 : Math.min(1, linear.current + (now - last) / duration);
      last = now;
      setP(easeInOut(linear.current));
      if (linear.current < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, duration, reduce]);
  return p;
}
