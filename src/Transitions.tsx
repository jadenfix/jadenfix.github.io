import { useEffect, useLayoutEffect, useRef } from 'react';
import { EASE, GLYPH_TICK, GLYPHS, cssEase, reducedMotion } from './motion';
import { onScrollFrame } from './scroll';

/**
 * Between pages the screen refreshes like a CRT: a hard cut to the void, then
 * a phosphor scanline sweeps down and the new page develops behind it, a row
 * of characters dissolving along its edge. Compositor-only (WAAPI transforms
 * and opacity); the glyph row is one text node updated at the glyph rate.
 */
export function RouteVeil({ pageKey }: { pageKey: string }) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLPreElement>(null);
  const first = useRef(true);

  // layout effect: the veil is up before the new page is ever painted
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reducedMotion() || !root.current?.animate) return;
    const el = root.current!;
    const ms = 760;
    const hold = 90;
    const opts = { duration: ms, delay: hold, easing: cssEase(EASE.sweep), fill: 'both' as const };
    el.style.visibility = 'visible';
    const a = panel.current!.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], opts);
    const b = edge.current!.animate(
      [
        { transform: 'translate3d(0,0,0)', opacity: 1 },
        { transform: 'translate3d(0,85vh,0)', opacity: 1, offset: 0.85 },
        { transform: 'translate3d(0,100vh,0)', opacity: 0 },
      ],
      opts,
    );
    const cols = Math.ceil(window.innerWidth / 6.6);
    let raf = 0;
    let last = 0;
    const line = (density: number) => {
      let s = '';
      for (let i = 0; i < cols; i++) s += Math.random() < density ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ' ';
      return s;
    };
    const t0 = performance.now();
    const glyphs = (now: number) => {
      if (now - last >= GLYPH_TICK) {
        last = now;
        // the dissolve thins out as the sweep finishes
        const k = Math.min(1, (now - t0) / (ms + hold));
        row.current!.textContent = `${line(0.12 * (1 - k))}\n${line(0.4 * (1 - k * 0.7))}`;
      }
      raf = requestAnimationFrame(glyphs);
    };
    raf = requestAnimationFrame(glyphs);
    const end = () => {
      cancelAnimationFrame(raf);
      el.style.visibility = 'hidden';
    };
    b.finished.then(end, end);
    return () => {
      a.cancel();
      b.cancel();
      end();
    };
  }, [pageKey]);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[55]" style={{ visibility: 'hidden' }}>
      <div ref={panel} className="absolute inset-0 origin-bottom bg-void" />
      <div ref={edge} className="absolute inset-x-0 top-0">
        <pre ref={row} className="absolute bottom-[1px] left-0 m-0 w-full overflow-hidden whitespace-pre text-[11px] leading-[1.15] text-phos/70" />
        <div className="h-px bg-phos shadow-[0_0_12px_2px_rgba(232,169,106,0.45)]" />
      </div>
    </div>
  );
}

/**
 * Reading progress as a thin phosphor dash along the header's bottom edge.
 * Transform only; nothing runs unless the page is scrolling.
 */
export function ScrollProgress({ show }: { show: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let docH = document.documentElement.scrollHeight;
    // the page grows as demos load: track its height without reading layout on scroll
    const ro = new ResizeObserver(() => (docH = document.documentElement.scrollHeight));
    ro.observe(document.body);
    const off = onScrollFrame((y, vh) => {
      const p = Math.min(1, Math.max(0, y / Math.max(1, docH - vh)));
      bar.current!.style.transform = `translate3d(${(p - 1) * 100}%,0,0)`;
    });
    return () => {
      off();
      ro.disconnect();
    };
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px overflow-hidden transition-opacity duration-short"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div ref={bar} className="progress-dash h-full w-full" style={{ transform: 'translate3d(-100%,0,0)' }} />
    </div>
  );
}
