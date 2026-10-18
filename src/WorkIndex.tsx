import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from './motion';
import { useReveal } from './scroll';
import { Readout } from './ui';

// The opening index: every paper and project on one screen, each with a tiny
// character animation of what its demo does further down the page.

const W = 28;
const H = 3;

type Frame = (t: number) => string[];

const blank = () => Array.from({ length: H }, () => Array(W).fill(' '));
const join = (g: string[][]) => g.map((r) => r.join(''));
const put = (g: string[][], x: number, y: number, c: string) => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (yi >= 0 && yi < H && xi >= 0 && xi < W) g[yi][xi] = c;
};

const frames: Record<string, Frame> = {
  // a prompt being typed, then the tests going green
  rusty: (t) => {
    const cmd = 'fix the discount bug';
    const k = t % 9;
    const typed = cmd.slice(0, Math.max(0, Math.floor(k * 6)));
    const lines = ['› ' + typed + (Math.floor(t * 2) % 2 ? '▌' : ' '), k > 4 ? '  editing pricing.py' : '', k > 6 ? '  ✓ 12 passed' : ''];
    return lines.map((l) => l.padEnd(W).slice(0, W));
  },
  // a point that walks the chain but loops in place at the second state
  credit: (t) => {
    const g = blank();
    const xs = [2, 9, 16, 23];
    for (let x = 2; x <= 23; x++) put(g, x, 1, '·');
    xs.forEach((x) => put(g, x, 1, 'o'));
    const p = t % 6;
    if (p < 1) put(g, 2 + p * 7, 1, '●');
    else if (p < 3) {
      const a = (p - 1) * Math.PI;
      put(g, 9 + Math.sin(a) * 2.2, 1 - Math.cos(a), '●');
      put(g, 9, 0, '⟲');
    } else put(g, Math.min(23, 9 + (p - 3) * 5), 1, '●');
    return join(g);
  },
  // a price series with a bear market shading in
  regimes: (t) => {
    const g = blank();
    for (let x = 0; x < W; x++) {
      const u = x + t * 3;
      const y = 1 - 0.9 * Math.sin(u * 0.35) * Math.cos(u * 0.11);
      const bear = Math.sin(u * 0.11) < -0.55;
      if (bear) for (let r = 0; r < H; r++) put(g, x, r, '░');
      put(g, x, y, bear ? '▼' : '─');
    }
    return join(g);
  },
  // two trajectories and the transport lines between them settling
  transport: (t) => {
    const g = blank();
    const k = (Math.sin(t * 0.8) + 1) / 2;
    for (let x = 1; x < W - 1; x += 3) {
      put(g, x, 0, '•');
      put(g, x + 1, 2, '•');
      put(g, x + (k < 0.5 ? 0 : 1), 1, k < 0.5 ? '\\' : '|');
    }
    put(g, 13 + Math.round(k * 3), 0, '◆');
    return join(g);
  },
  // runs flipping from passed to unsafe
  bench: (t) => {
    const g = blank();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x += 2) {
        const id = y * 31 + x * 7;
        const unsafe = (id * 9301 + 49297) % 233 < 104;
        const flip = (t * 1.4 + id * 0.05) % 6 > 3;
        put(g, x, y, unsafe && flip ? '▪' : '■');
      }
    return join(g);
  },
  // a particle bouncing between mirror points while drifting
  spacewind: (t) => {
    const g = blank();
    put(g, 13, 1, '◯');
    for (let s = 0; s < 14; s++) {
      const u = t * 2 - s * 0.18;
      const x = 13 + Math.cos(u * 0.35) * 11;
      const y = 1 + Math.sin(u * 2.4) * 1.1;
      put(g, x, y, s === 0 ? '●' : s < 5 ? '∙' : '·');
    }
    return join(g);
  },
  // a log Bayes factor that wanders at zero, then drifts once the laws differ
  simulation: (t) => {
    const g = blank();
    for (let x = 0; x < W; x++) put(g, x, 1, '·');
    const phase = t % 10;
    for (let x = 0; x < W; x++) {
      const u = t * 2 - (W - x) * 0.35;
      const walk = Math.sin(u * 1.7) * 0.5 + Math.sin(u * 0.63) * 0.4;
      const drift = phase > 5 ? -((x / W) * (phase - 5)) * 0.45 : 0;
      put(g, x, 1 + walk + drift, x === W - 1 ? '●' : '∙');
    }
    put(g, 0, 0, phase > 5 ? 'Δ' : '=');
    return join(g);
  },
  // a span tree forking at one step and replaying downstream
  replay: (t) => {
    const g = blank();
    const n = 8;
    const fork = 3;
    const p = Math.floor(t * 2) % 14;
    for (let i = 0; i < n; i++) put(g, 2 + i * 3, 0, '■');
    put(g, 2 + fork * 3, 1, '╰');
    for (let i = fork; i < n; i++) put(g, 3 + i * 3, 2, i - fork < p - 3 ? '■' : '□');
    if (p > 2) put(g, 4 + fork * 3, 1, '┐');
    return join(g);
  },
  // a book with the market maker's quotes moving
  mm: (t) => {
    const g = blank();
    const mid = 14 + Math.round(Math.sin(t * 0.7) * 3);
    for (let x = 0; x < W; x++) {
      const depth = 1 + ((x * 17 + Math.floor(t * 3)) % 3);
      const ch = x < mid ? '▁▃▅'[depth - 1] : '▁▃▅'[depth - 1];
      put(g, x, 2, ch);
    }
    put(g, mid - 2, 1, 'b');
    put(g, mid + 2, 1, 'a');
    put(g, mid, 0, '│');
    if (Math.floor(t * 1.5) % 4 === 0) put(g, mid + 2, 0, '✦');
    return join(g);
  },
  // segments folding into short summaries while vanilla keeps growing
  infty: (t) => {
    const p = (t * 4) % 26;
    const seg = Math.floor(p / 6.5);
    const top = ('▪'.repeat(seg) + '█'.repeat(Math.floor(p % 6.5))).padEnd(W).slice(0, W);
    const bottom = '█'.repeat(Math.min(W, Math.floor(p))).padEnd(W);
    return ['infty ' + top.slice(0, W - 6), 'cot   ' + bottom.slice(0, W - 6), ''.padEnd(W)];
  },
};

type Row = { key: string; n: string; name: string; kind: string; line: string; href: string };

const rows: Row[] = [
  { key: 'rusty', n: '01', name: 'rusty', kind: 'coding agent', line: 'a coding agent in one Rust binary, working', href: '#rusty' },
  { key: 'credit', n: '02', name: 'loop-action bias', kind: 'paper', line: 'the paper’s scorers, running live', href: '#branch-aware' },
  { key: 'regimes', n: '03', name: 'bear-market regimes', kind: 'thesis', line: '150 years of the S&P 500, two regimes', href: '#predictive-stochastic-modeling' },
  { key: 'transport', n: '04', name: 'critique transport', kind: 'research', line: 'Sinkhorn on real model latents', href: '#critique-transport' },
  { key: 'bench', n: '05', name: 'FullStack-Bench', kind: 'benchmark', line: 'runs that passed, then turned out unsafe', href: '#fullstack-bench' },
  { key: 'spacewind', n: '06', name: 'Spacewind', kind: 'physics', line: 'radiation belts, solar wind, black holes', href: '#spacewind' },
  { key: 'simulation', n: '07', name: 'simulation-theory', kind: 'theory', line: 'can you tell if a world is simulated?', href: '#simulation-theory' },
  { key: 'replay', n: '08', name: 'ReplayKit', kind: 'debugger', line: 'fork an agent run, replay downstream', href: '#replaykit' },
  { key: 'mm', n: '09', name: 'DRL4MM', kind: 'reinforcement learning', line: 'a TD3 market maker on real order flow', href: '#drl4mm' },
  { key: 'infty', n: '10', name: 'InftyThink', kind: 'reasoning', line: 'bounded-context reasoning, real traces', href: '#inftythink' },
];

function IndexRow({ r, i, hot, setHot, pre }: { r: Row; i: number; hot: boolean; setHot: (k: string | null) => void; pre: (el: HTMLPreElement | null) => void }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useReveal(ref);
  return (
    <a
      ref={ref}
      href={r.href}
      data-from="left"
      data-hot={hot ? '1' : undefined}
      // mouse only: on touch a tap would leave the row lit
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHot(r.key)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHot(null)}
      onFocus={() => setHot(r.key)}
      onBlur={() => setHot(null)}
      className={`reveal row group relative grid items-center gap-x-6 gap-y-2 px-1 py-3 sm:grid-cols-[34px_1fr_auto] md:grid-cols-[34px_220px_1fr_auto] ${
        i ? 'border-t border-line/70' : ''
      } transition-colors hover:bg-panel`}
    >
      <span aria-hidden className="row-tick absolute bottom-3 left-0 top-3 w-px origin-bottom bg-phos" />
      <Readout value={r.n} className={`hidden text-[11px] transition-colors sm:block ${hot ? 'text-phos' : 'text-faint'}`} />
      <span>
        <span className={`row-name display text-[24px] leading-tight ${hot ? 'text-phos' : 'text-bone'}`}>{r.name}</span>
        <span className="block text-[11px] text-faint">{r.kind}</span>
      </span>
      <span className={`hidden text-[12.5px] transition-colors md:block ${hot ? 'text-bone' : 'text-dim'}`}>{r.line}</span>
      <span className="flex items-center gap-4">
        <pre ref={pre} aria-hidden className={`m-0 select-none text-[11px] leading-[1.25] transition-colors duration-short ${hot ? 'text-phos' : 'text-faint'}`}>
          {frames[r.key](0).join('\n')}
        </pre>
        <span aria-hidden className={`text-[12px] transition-[transform,color] duration-short ${hot ? 'translate-x-1 text-phos' : 'text-faint'}`}>→</span>
      </span>
    </a>
  );
}

export default function WorkIndex() {
  const ref = useRef<HTMLDivElement>(null);
  const pres = useRef<(HTMLPreElement | null)[]>([]);
  const [hot, setHot] = useState<string | null>(null);

  // the little animations write straight into their <pre>s, about nine times a
  // second, and only while the index is on screen: no React work per frame
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    let last = 0;
    let t = 0;
    let visible = false;
    const frame = (now: number) => {
      if (now - last >= 110) {
        t += last ? Math.min(0.25, (now - last) / 1000) : 0;
        last = now;
        rows.forEach((r, i) => {
          const el = pres.current[i];
          if (el) el.textContent = frames[r.key](t).join('\n');
        });
      }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting === visible) return;
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      last = 0;
      if (visible) raf = requestAnimationFrame(frame);
    });
    io.observe(ref.current!);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="border-y border-line">
      {rows.map((r, i) => (
        <IndexRow key={r.key} r={r} i={i} hot={hot === r.key} setHot={setHot} pre={(el) => void (pres.current[i] = el)} />
      ))}
    </div>
  );
}
