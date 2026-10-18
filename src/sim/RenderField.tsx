import { useEffect, useRef } from 'react';
import { reducedMotion } from '../motion';

// A world that only renders where it is observed. The field is one smooth
// function of space and time; near the observer it is drawn cell by cell,
// further out in coarser and coarser blocks, and beyond that it is left as
// faint placeholder dust. Sharpness lingers a little after the observer moves
// on, then the world quietly forgets. With no pointer, a slow observer wanders.

const RAMP = ' .·:-=+*#%@';
const CELL_FONT = 13;

// a few slow wave sources and a warp, all cheap
function field(x: number, y: number, t: number): number {
  const wx = x + Math.sin(y * 0.09 + t * 0.21) * 3.2;
  const wy = y + Math.cos(x * 0.07 - t * 0.17) * 2.4;
  const a = Math.sin(Math.hypot(wx - 30 - Math.sin(t * 0.13) * 18, (wy - 14) * 1.9) * 0.42 - t * 1.1);
  const b = Math.sin(Math.hypot(wx - 90 + Math.cos(t * 0.11) * 22, (wy - 30) * 1.9) * 0.37 - t * 0.9);
  const c = Math.sin(wx * 0.05 + wy * 0.11 + t * 0.35);
  return (a + b + 0.6 * c) / 2.6;
}

export default function RenderField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const still = reducedMotion();
    let cols = 0;
    let rows = 0;
    let cw = 8;
    let ch = 15;
    let dpr = 1;
    let sharp = new Float32Array(0);
    let px = -1e4;
    let py = -1e4;
    let lastMove = -1e9;
    let raf = 0;
    let last = 0;
    let visible = true;
    const t0 = performance.now();
    const css = getComputedStyle(document.documentElement);
    const rgb = (v: string) => css.getPropertyValue(v).trim().split(/\s+/).join(',');

    const size = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${CELL_FONT}px ui-monospace, "JetBrains Mono", Menlo, monospace`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width;
      ch = CELL_FONT * 1.18;
      cols = Math.ceil(r.width / cw);
      rows = Math.ceil(r.height / ch);
      sharp = new Float32Array(cols * rows);
    };

    const draw = (now: number) => {
      const t = still ? 12 : (now - t0) / 1000;
      // the observer: the pointer while it's around, otherwise a slow wanderer
      let ox: number;
      let oy: number;
      if (now - lastMove < 2500) {
        ox = px / cw;
        oy = py / ch;
      } else {
        // on a phone the text sits low, so the wanderer keeps to the top
        const narrow = cols < 70;
        ox = cols * (narrow ? 0.5 + 0.35 * Math.sin(t * 0.23) : 0.62 + 0.26 * Math.sin(t * 0.23));
        oy = rows * (narrow ? 0.24 + 0.12 * Math.sin(t * 0.31 + 1.2) : 0.5 + 0.3 * Math.sin(t * 0.31 + 1.2));
      }
      const R = Math.max(9, Math.min(cols, rows * 2) * 0.16);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.03;
      last = now;
      const fade = Math.pow(0.5, dt / 0.9); // half-life of a memory

      // four inks: rendered (bright), half (2x2), coarse (4x4), dust
      const lines: string[][] = [[], [], [], []];
      for (let r = 0; r < rows; r++) {
        const L = [new Array(cols), new Array(cols), new Array(cols), new Array(cols)];
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const d = Math.hypot((c - ox) * 0.5, r - oy) / R;
          const s = Math.max(sharp[i] * fade, Math.max(0, 1 - d * d));
          sharp[i] = s;
          let ink: number;
          let v: number;
          if (s > 0.55) {
            ink = 0;
            v = field(c * 0.5, r, t);
          } else if (s > 0.2) {
            ink = 1;
            v = field((c & ~1) * 0.5, r & ~1, t);
          } else if (s > 0.04) {
            ink = 2;
            v = field((c & ~3) * 0.5, r & ~3, t);
          } else {
            ink = 3;
            // unrendered: a sparse lattice of dust, sampled very coarsely
            v = (c & 3) === 0 && (r & 1) === 0 ? field((c & ~7) * 0.5, r & ~7, t * 0.5) : -1;
          }
          for (let k = 0; k < 4; k++) L[k][c] = ' ';
          if (v > -1) {
            const g = ink === 3 ? (v > 0.15 ? '·' : ' ') : RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(((v + 1) / 2) * RAMP.length)))];
            L[ink][c] = g;
          }
        }
        for (let k = 0; k < 4; k++) lines[k].push(L[k].join(''));
      }

      const W = cv.width / dpr;
      const H = cv.height / dpr;
      ctx.clearRect(0, 0, W, H);
      const phos = rgb('--c-phos');
      const ice = rgb('--c-ice');
      const bone = rgb('--c-bone');
      const faint = rgb('--c-faint');
      const inks = [`rgba(${bone},0.95)`, `rgba(${phos},0.62)`, `rgba(${ice},0.32)`, `rgba(${faint},0.55)`];
      for (let k = 3; k >= 0; k--) {
        ctx.fillStyle = inks[k];
        for (let r = 0; r < rows; r++) ctx.fillText(lines[k][r], 0, r * ch);
      }
      // a faint chromatic ghost on the rendered region, the only colour shift
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${phos},0.16)`;
      for (let r = 0; r < rows; r++) ctx.fillText(lines[0][r], 0.9, r * ch + 0.4);
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      if (!visible) return;
      if (now - last >= 33) draw(now);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      px = x;
      py = y;
      lastMove = performance.now();
      if (still) draw(lastMove);
    };

    size();
    draw(performance.now());
    const ro = new ResizeObserver(() => {
      size();
      draw(performance.now());
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(cv);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
