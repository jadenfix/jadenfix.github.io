import { useCallback, useEffect, useRef, useState } from 'react';
import { GLYPH_TICK, glyph, reducedMotion } from './motion';

/** Decode-on-hover text, the old site's ScrambleText in a quieter voice. */
export function useScramble(text: string) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  const run = useCallback(() => {
    if (reducedMotion()) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const dur = 420;
    let last = -Infinity;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      // glyphs change at the house rate, not every frame: it reads as decoding, not static
      if (now - last >= GLYPH_TICK || k === 1) {
        last = now;
        const fixed = Math.floor(k * text.length);
        setOut(
          text
            .split('')
            .map((ch, i) => (i < fixed || ch === ' ' ? ch : glyph()))
            .join(''),
        );
      }
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [text]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return [out, run] as const;
}

/** Wall-clock time in San Francisco, updated each minute. */
export function useSfTime() {
  const fmt = () =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(new Date()).toLowerCase();
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setT(fmt()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}
