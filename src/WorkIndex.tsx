import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

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
  { key: 'regimes', n: '03', name: 'bear-market regimes', kind: 'thesis', line: 'a century of the S&P 500, two regimes', href: '#predictive-stochastic-modeling' },
  { key: 'transport', n: '04', name: 'critique transport', kind: 'research', line: 'Sinkhorn on real model latents', href: '#critique-transport' },
  { key: 'bench', n: '05', name: 'FullStack-Bench', kind: 'benchmark', line: 'runs that passed, then turned out unsafe', href: '#fullstack-bench' },
  { key: 'spacewind', n: '06', name: 'Spacewind', kind: 'physics', line: 'radiation belts, solar wind, black holes', href: '#spacewind' },
  { key: 'replay', n: '07', name: 'ReplayKit', kind: 'debugger', line: 'fork an agent run, replay downstream', href: '#replaykit' },
  { key: 'mm', n: '08', name: 'DRL4MM', kind: 'reinforcement learning', line: 'a TD3 market maker on real order flow', href: '#drl4mm' },
  { key: 'infty', n: '09', name: 'InftyThink', kind: 'reasoning', line: 'bounded-context reasoning, real traces', href: '#inftythink' },
];

function Preview({ k, active, t }: { k: string; active: boolean; t: number }) {
  const lines = frames[k](t);
  return (
    <pre aria-hidden className={`m-0 select-none text-[11px] leading-[1.25] transition-colors duration-500 ${active ? 'text-phos' : 'text-faint'}`}>
      {lines.join('\n')}
    </pre>
  );
}

export default function WorkIndex() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '0px' });
  const [t, setT] = useState(0);
  const [hot, setHot] = useState<string | null>(null);

  useEffect(() => {
    if (!inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now() - t * 1000;
    const id = window.setInterval(() => setT((performance.now() - start) / 1000), 110);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <div ref={ref} className="border-y border-line">
      {rows.map((r, i) => (
        <motion.a
          key={r.key}
          href={r.href}
          onMouseEnter={() => setHot(r.key)}
          onMouseLeave={() => setHot(null)}
          onFocus={() => setHot(r.key)}
          onBlur={() => setHot(null)}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.05 * i }}
          className={`group grid items-center gap-x-6 gap-y-2 px-1 py-3 sm:grid-cols-[34px_1fr_auto] md:grid-cols-[34px_220px_1fr_auto] ${
            i ? 'border-t border-line/70' : ''
          } transition-colors hover:bg-panel`}
        >
          <span className="hidden text-[11px] text-faint sm:block">{r.n}</span>
          <span>
            <span className={`display block text-[24px] leading-tight transition-colors ${hot === r.key ? 'text-phos' : 'text-bone'}`}>{r.name}</span>
            <span className="text-[11px] text-faint">{r.kind}</span>
          </span>
          <span className="hidden text-[12.5px] text-dim md:block">{r.line}</span>
          <span className="flex items-center gap-4">
            <Preview k={r.key} active={hot === r.key} t={t} />
            <span className={`text-[12px] transition-transform ${hot === r.key ? 'translate-x-1 text-phos' : 'text-faint'}`}>→</span>
          </span>
        </motion.a>
      ))}
    </div>
  );
}
