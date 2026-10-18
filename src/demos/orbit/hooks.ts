import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

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

/** whether the element is on screen right now (IntersectionObserver), and whether it ever has been */
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
