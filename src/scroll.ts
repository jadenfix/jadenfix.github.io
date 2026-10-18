import { useEffect, useRef, useState, type RefObject } from 'react';
import { STAGGER, reducedMotion } from './motion';

// Two small shared engines, so the whole page needs one scroll listener and
// one IntersectionObserver for its entrances instead of one per element.

// ------------------------------------------------------------------ scroll
type ScrollFn = (y: number, vh: number) => void;
const scrollSubs = new Set<ScrollFn>();
let scrollRaf = 0;
let vh = typeof window !== 'undefined' ? window.innerHeight : 800;

const flush = () => {
  scrollRaf = 0;
  const y = window.scrollY;
  scrollSubs.forEach((f) => f(y, vh));
};
const schedule = () => {
  if (!scrollRaf) scrollRaf = requestAnimationFrame(flush);
};

/**
 * Calls `fn` at most once per frame while the page scrolls (and once on
 * subscribe). Nothing runs while the page is still. `fn` should only write
 * transforms and opacity.
 */
export function onScrollFrame(fn: ScrollFn) {
  if (scrollSubs.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }
  scrollSubs.add(fn);
  schedule();
  return () => {
    scrollSubs.delete(fn);
    if (scrollSubs.size === 0) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
    }
  };
}
function onResize() {
  vh = window.innerHeight;
  schedule();
}

// ------------------------------------------------------------------ depth
/**
 * The hero recedes as you leave it: it drifts down at a fraction of the scroll
 * speed (so the page passes over it, a layer behind), shrinks slightly and
 * dims. Writes one transform and one opacity per scrolled frame, and none at
 * all once the hero is well out of view.
 */
export function useRecede(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let h = el.offsetHeight || 1;
    const ro = new ResizeObserver(() => (h = el.offsetHeight || 1));
    ro.observe(el);
    let parked = false;
    const off = onScrollFrame((y) => {
      const p = Math.min(1, y / (h * 1.1));
      if (p >= 1 && parked) return;
      parked = p >= 1;
      el.style.transform = p <= 0 ? '' : `translate3d(0,${(y * 0.22).toFixed(1)}px,0) scale(${(1 - 0.05 * p).toFixed(4)})`;
      el.style.opacity = p <= 0 ? '' : (1 - 0.72 * p).toFixed(3);
    });
    return () => {
      off();
      ro.disconnect();
      el.style.transform = '';
      el.style.opacity = '';
    };
  }, [ref]);
}

// ------------------------------------------------------------------ reveal
// Elements that come into view in the same observer callback are one cohort:
// they enter in reading order, a beat apart, however many there are. So a list
// cascades when you reach it, and a single late straggler doesn't wait for a
// delay meant for the tenth row.
type Pending = { extra: number; done?: (delay: number) => void };
const pending = new WeakMap<Element, Pending>();
let io: IntersectionObserver | null = null;

function observer() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      const cohort = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      cohort.forEach((e, i) => {
        const el = e.target as HTMLElement;
        const p = pending.get(el);
        io!.unobserve(el);
        pending.delete(el);
        const delay = (p?.extra ?? 0) + Math.min(i, 7) * STAGGER;
        el.style.transitionDelay = `${delay}s`;
        el.style.setProperty('--reveal-delay', `${delay}s`);
        el.dataset.in = '1';
        p?.done?.(delay);
        // hand the element back to its own transitions once it has arrived
        el.addEventListener('transitionend', () => (el.style.transitionDelay = ''), { once: true });
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  return io;
}

/** Marks `ref` to enter (via the `.reveal` CSS) when it first scrolls into view. */
export function useReveal<T extends HTMLElement>(ref: RefObject<T | null>, delay = 0, onIn?: (delay: number) => void) {
  const cb = useRef(onIn);
  useEffect(() => {
    cb.current = onIn;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.dataset.in = '1';
      cb.current?.(0);
      return;
    }
    pending.set(el, { extra: delay, done: (d) => cb.current?.(d) });
    observer().observe(el);
    return () => {
      io?.unobserve(el);
      pending.delete(el);
    };
  }, [ref, delay]);
}

/**
 * null until `ref` enters the view, then the delay (seconds) its cohort slot
 * asks for, so script-driven entrances keep time with the CSS ones.
 */
export function useEntered<T extends HTMLElement>(ref: RefObject<T | null>, delay = 0) {
  const [at, setAt] = useState<number | null>(null);
  useReveal(ref, delay, (d) => setAt(d));
  return at;
}
