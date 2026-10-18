import { useEffect, useState, type RefObject } from 'react';

/** content-box size of an element, tracked with ResizeObserver */
export function useSize(ref: RefObject<Element | null>, fallback: [number, number] = [320, 120]): [number, number] {
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize([Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height))]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
