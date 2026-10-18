import { useEffect, useRef } from 'react';

// A black hole drawn in characters. Geometry for every character cell (which
// rays fall in, where they cross the disk, their redshift, and where escaping
// rays land on the sky) is precomputed in Python from the Schwarzschild
// geodesic equation: see scripts/ascii_geom.py. Here we only animate the disk's
// Keplerian rotation and the drifting stars, so it can run forever, calmly.

type Meta = { cols: number; rows: number; channels: number; cellAspect: number; rIn: number; rOut: number };

const DISK_RAMP = ' .·:-=+*#%@';
const STAR_CHARS = ['.', '·', '+', '*'];
const FPS = 20;
const SPIN = 6.5; // inner edge turns about once every 14 s
const DRIFT = 0.0006; // sky drift, turns per second

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function diskColour(temp: number, a: number) {
  // deep ember to warm white, like a cooling filament
  const t = Math.min(1, Math.max(0, temp));
  const r = 200 + 55 * t;
  const g = 92 + 150 * t;
  const b = 40 + 175 * t * t;
  return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(2)})`;
}

export default function AsciiHole({ className = '' }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let visible = true;
    let stopped = false;
    let cleanup = () => {};
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (async () => {
      const [meta, buf] = await Promise.all([
        fetch('/media/hole.json').then((r) => r.json() as Promise<Meta>),
        fetch('/media/hole.bin').then((r) => r.arrayBuffer()),
      ]);
      await document.fonts.ready;
      if (stopped) return;
      const raw = new Uint16Array(buf);
      const { cols, rows, channels, rIn, rOut } = meta;
      const n = cols * rows;
      const ch = (cell: number, c: number) => raw[cell * channels + c] / 65535;

      // unpack per-cell constants once
      const hits: { cell: number; r: number; psi: number; g: number; base: number }[][] = Array.from({ length: n }, () => []);
      const lon = new Float32Array(n);
      const lat = new Float32Array(n);
      const cap = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 3; k++) {
          if (ch(i, 4 * k + 3) > 0.5) {
            const r = rIn + ch(i, 4 * k) * (rOut - rIn);
            const edge = Math.min(1, (rOut - r) / 2.2) * Math.min(1, (r - rIn) / 0.4);
            const base = Math.pow(r / rIn, -2.1) * Math.pow(Math.max(0, 1 - Math.sqrt(rIn / r)), 0.55) * edge;
            hits[i].push({ cell: i, r, psi: ch(i, 4 * k + 1) * Math.PI * 2, g: ch(i, 4 * k + 2) * 2, base });
          }
        }
        lon[i] = ch(i, 12);
        lat[i] = ch(i, 13);
        cap[i] = ch(i, 14) > 0.5 ? 1 : 0;
      }
      let maxBase = 0;
      hits.forEach((hs) => hs.forEach((h) => (maxBase = Math.max(maxBase, h.base))));

      const ctxs = [main.current!.getContext('2d')!, glow.current!.getContext('2d')!];
      let cellW = 0;
      let lineH = 0;

      const resize = () => {
        // on narrow screens keep the characters legible and crop to the centre
        const box = wrap.current!.clientWidth;
        const w = Math.max(box, 620);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cellW = w / cols;
        lineH = cellW / meta.cellAspect;
        const h = lineH * rows;
        const shown = h * (box < 620 ? 0.82 : 1);
        for (const c of [main.current!, glow.current!]) {
          c.width = Math.round(w * dpr);
          c.height = Math.round(h * dpr);
          c.style.width = `${w}px`;
          c.style.height = `${h}px`;
          c.style.left = `${(box - w) / 2}px`;
          c.style.top = `${(shown - h) / 2}px`;
        }
        wrap.current!.style.height = `${shown}px`;
        const ctx = ctxs[0];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${(cellW / 0.6).toFixed(2)}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
      };
      resize();
      const ro = new ResizeObserver(resize);

      // the pointer is a second, smaller mass: starlight bends around it too
      const ptr = { col: -99, row: -99, inside: false, mass: 0 };
      const onMove = (e: PointerEvent) => {
        const r = main.current!.getBoundingClientRect();
        ptr.col = (e.clientX - r.left) / cellW;
        ptr.row = (e.clientY - r.top) / lineH;
        ptr.inside = ptr.col > 0 && ptr.col < cols && ptr.row > 0 && ptr.row < rows;
      };
      const onLeave = () => (ptr.inside = false);
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
      const THETA_E = 2.4; // einstein radius of the pointer mass, in line heights
      const ASPECT = meta.cellAspect;
      ro.observe(wrap.current!);

      const draw = (time: number) => {
        const t = time / 1000;
        const ctx = ctxs[0];
        ctx.clearRect(0, 0, cols * cellW, rows * lineH);
        ptr.mass += ((ptr.inside ? 1 : 0) - ptr.mass) * 0.12;
        const k = THETA_E * THETA_E * ptr.mass;
        for (let i = 0; i < n; i++) {
          const x = (i % cols) * cellW;
          const y = Math.floor(i / cols) * lineH;
          const hs = hits[i];
          if (hs.length) {
            let inten = 0;
            let temp = 0;
            let trans = 1;
            for (const h of hs) {
              const om = Math.pow(h.r, -1.5) * SPIN;
              const a = h.psi - om * t;
              const band = 0.62 + 0.38 * Math.sin(h.r * 9.3) * Math.sin(h.r * 3.1 + 1.3);
              const swirl =
                0.55 +
                0.22 * Math.cos(3 * a + h.r * 1.7) +
                0.15 * Math.cos(7 * a + h.r * 4.1 + 2) +
                0.08 * Math.cos(13 * a - h.r * 2.3);
              const em = (h.base / maxBase) * band * swirl;
              const v = em * Math.pow(h.g, 2.2);
              inten += trans * v;
              temp = Math.max(temp, h.g * (0.55 + 0.45 * (h.base / maxBase)));
              trans *= 1 - Math.min(0.9, em * 1.2);
            }
            const idx = Math.min(DISK_RAMP.length - 1, Math.floor(Math.pow(inten, 0.5) * 12));
            if (idx > 0) {
              ctx.fillStyle = diskColour(temp - 0.2, Math.min(1, 0.5 + inten * 0.8));
              ctx.fillText(DISK_RAMP[idx], x, y);
            }
            if (trans < 0.3) continue;
          }
          if (cap[i]) continue;
          // stars on a drifting sky, sampled through the lens (and the pointer's lens)
          let j = i;
          if (k > 0.01) {
            const col = (i % cols) + 0.5;
            const row = Math.floor(i / cols) + 0.5;
            const dx = (col - ptr.col) * ASPECT;
            const dy = row - ptr.row;
            const r2 = dx * dx + dy * dy;
            if (r2 < 0.36 * k) continue; // its own small shadow
            if (r2 < 60 * k) {
              const sc = Math.round(col - (k * dx) / r2 / ASPECT - 0.5);
              const sr = Math.round(row - (k * dy) / r2 - 0.5);
              if (sc < 0 || sc >= cols || sr < 0 || sr >= rows) continue;
              j = sr * cols + sc;
              if (cap[j]) continue;
            }
          }
          const L = (lon[j] + DRIFT * t) % 1;
          const gx = L * 900;
          const gy = lat[j] * 450;
          const sx = Math.floor(gx);
          const sy = Math.floor(gy);
          const hsh = hash(sx, sy);
          if (hsh < 0.035) {
            const px = hash(sx + 7, sy) - 0.5;
            const py = hash(sx, sy + 11) - 0.5;
            const dx = gx - sx - 0.5 - px * 0.6;
            const dy = gy - sy - 0.5 - py * 0.6;
            const d2 = dx * dx + dy * dy;
            if (d2 < 0.22) {
              const mag = hash(sx + 3, sy + 5);
              const tw = 0.7 + 0.3 * Math.sin(t * (0.6 + mag * 1.4) + hsh * 900);
              const b = (1 - d2 / 0.22) * (0.35 + 0.65 * mag) * tw;
              const c = STAR_CHARS[Math.min(3, Math.floor(b * 3.2))];
              ctx.fillStyle = `rgba(196,204,222,${(0.25 + 0.6 * b).toFixed(2)})`;
              ctx.fillText(c, x, y);
            }
          }
        }
        // phosphor bloom: a blurred copy underneath
        const g = ctxs[1];
        g.clearRect(0, 0, g.canvas.width, g.canvas.height);
        g.drawImage(main.current!, 0, 0);
      };

      let last = 0;
      const loop = (time: number) => {
        if (stopped) return;
        if (visible && time - last >= 1000 / FPS) {
          last = time;
          draw(time);
        }
        raf = requestAnimationFrame(loop);
      };
      if (reduce) draw(8000);
      else raf = requestAnimationFrame(loop);

      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
      io.observe(wrap.current!);
      cleanup = () => {
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerleave', onLeave);
      };
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, []);

  return (
    <div ref={wrap} className={`relative w-full select-none overflow-hidden ${className}`} aria-label="A black hole drawn in characters, its disk slowly turning." role="img">
      <canvas ref={glow} className="absolute top-0 opacity-70 blur-[6px]" aria-hidden />
      <canvas ref={main} className="absolute top-0" aria-hidden />
    </div>
  );
}
