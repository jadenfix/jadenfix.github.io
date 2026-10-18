import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import AsciiHole from './AsciiHole';
import CommandBar from './CommandBar';
import Cursor from './Cursor';
import { Markdown } from './Markdown';
import Memories from './Memories';
import RustyPlayer from './RustyPlayer';
import WorkIndex from './WorkIndex';
import { commits, links, roles, tempera, upstream } from './content';
import { useScramble, useSfTime } from './hooks';
import { formatDate, paperDocs, posts, type Doc } from './md';
import { Chip, Reveal, Rule, SectionHead, Typed } from './ui';

type Lazy = LazyExoticComponent<ComponentType>;

// Demos load on demand, and a demo that isn't there yet renders a quiet placeholder.
const demoModules = import.meta.glob<{ default: ComponentType }>('./demos/**/*.tsx');
const Missing = () => <div className="flex h-[200px] items-center justify-center border border-line text-[11px] text-faint">demo coming soon</div>;
const demo = (name: string): Lazy => {
  const load = demoModules[`./demos/${name}.tsx`];
  return lazy(load ?? (() => Promise.resolve({ default: Missing })));
};
const CreditSim = demo('CreditSim');
const RegimeExplorer = demo('RegimeExplorer');
const RegimeDensities = demo('thesis/RegimeDensities');
const ForecastSkill = demo('thesis/ForecastSkill');
const Calibration = demo('thesis/Calibration');
const Episodes = demo('thesis/Episodes');
const TransportDemo = demo('TransportDemo');
const BenchMatrix = demo('BenchMatrix');
const SpacewindLab = demo('SpacewindLab');
const ReplayDemo = demo('ReplayDemo');
const MarketMakerDemo = demo('MarketMakerDemo');
const InftyThinkDemo = demo('InftyThinkDemo');

// ------------------------------------------------------------------ research
type Paper = {
  slug: string;
  kind: string;
  title: string;
  teaser: string;
  links: { label: string; href: string }[];
  hero: Lazy;
  figures: { title: string; Comp: Lazy }[];
};

const THESIS_PDF =
  'https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/main/Predictive_Stochastic_Modeling_for_Financial_Markets.pdf';

const papers: Paper[] = [
  {
    slug: 'branch-aware',
    kind: 'paper · 2026',
    title: 'Branch-Aware Hindsight Credit Assignment for LLM Agents',
    teaser:
      'Outcome-only credit pays every step of a winning episode the same, so a stall earns as much as the move that won, and stalling never fails. The figure runs the paper’s own scorers on its controlled benchmark, live.',
    links: [
      { label: 'pdf', href: 'https://github.com/jadenfix/CreditAssignment/blob/main/paper/main.pdf' },
      { label: 'code', href: 'https://github.com/jadenfix/CreditAssignment' },
    ],
    hero: CreditSim,
    figures: [],
  },
  {
    slug: 'predictive-stochastic-modeling',
    kind: 'thesis · adam smith award',
    title: 'Predictive Stochastic Modeling for Financial Markets',
    teaser:
      'A century of S&P 500 bull and bear regimes, read two ways: filtered, with only the data available at the time, and smoothed, with hindsight. Scrub through it, or jump to 1929, 1987 or 2008.',
    links: [
      { label: 'revised pdf', href: 'https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-/blob/v2/v2/paper/Predictive_Stochastic_Modeling_v2.pdf' },
      { label: 'award pdf', href: THESIS_PDF },
      { label: 'code', href: 'https://github.com/jadenfix/Predictive-Stochastic-Modeling-for-Financial-Markets-' },
    ],
    hero: RegimeExplorer,
    figures: [
      { title: 'Two regimes', Comp: RegimeDensities },
      { title: 'Every bear market since 1900', Comp: Episodes },
      { title: 'Forecast skill by horizon', Comp: ForecastSkill },
      { title: 'Calibration', Comp: Calibration },
    ],
  },
  {
    slug: 'critique-transport',
    kind: 'in progress',
    title: 'Critique-Transport Smoothing',
    teaser:
      'Can a critique tell you where a long trajectory went wrong, and can optimal transport carry that signal back to the right steps? Below, entropic Sinkhorn aligning a failed trajectory with its critique-edited target, computed in your browser.',
    links: [{ label: 'code', href: 'https://github.com/jadenfix/CreditAssignment-LongHorizon' }],
    hero: TransportDemo,
    figures: [],
  },
];

// ------------------------------------------------------------------ routing
type Route = { name: 'home'; anchor?: string } | { name: 'blog' } | { name: 'post'; post: Doc } | { name: 'paper'; paper: Paper };

function readRoute(): Route {
  const h = window.location.hash;
  if (h === '#/blog' || h === '#/blog/') return { name: 'blog' };
  const post = h.match(/^#\/blog\/(.+)$/);
  if (post) {
    const p = posts.find((x) => x.slug === post[1]);
    if (p) return { name: 'post', post: p };
  }
  const paper = h.match(/^#\/papers\/(.+)$/);
  if (paper) {
    const p = papers.find((x) => x.slug === paper[1]);
    if (p) return { name: 'paper', paper: p };
  }
  return { name: 'home', anchor: h.startsWith('#') && !h.startsWith('#/') ? h.slice(1) : undefined };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (route.name === 'home' && route.anchor) {
      window.setTimeout(() => document.getElementById(route.anchor!)?.scrollIntoView(), 60);
    } else if (route.name !== 'home') window.scrollTo(0, 0);
  }, [route]);
  return route;
}

// ------------------------------------------------------------------ chrome
function NavLink({ href, label }: { href: string; label: string }) {
  const [text, scramble] = useScramble(label);
  return (
    <a href={href} onMouseEnter={scramble} onFocus={scramble} className="transition-colors hover:text-bone">
      {text}
    </a>
  );
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const time = useSfTime();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 ${scrolled ? 'border-b border-line bg-void/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="page flex h-14 items-center justify-between gap-4 text-[12px]">
        <a href="#top" className="flex items-center gap-2 text-bone">
          <span className="inline-block h-[11px] w-[6px] animate-blink bg-phos" aria-hidden />
          jaden fix
        </a>
        <nav className="hidden items-center gap-6 text-dim md:flex">
          <NavLink href="#research" label="research" />
          <NavLink href="#projects" label="projects" />
          <NavLink href="#experience" label="experience" />
          <NavLink href="#/blog" label="writing" />
        </nav>
        <div className="flex items-center gap-4 text-faint">
          <span className="hidden sm:inline" title="Local time in San Francisco">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-phos/80" />
            sf {time}
          </span>
          <button
            onClick={() => window.dispatchEvent(new Event('open-command-bar'))}
            className="border border-line px-1.5 py-px text-[11px] text-dim transition-colors hover:border-phos hover:text-phos"
            aria-label="Open navigation (press /)"
          >
            /
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="page mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-[11px] text-faint">
      <span>© {new Date().getFullYear()} jaden fix · press / to get around</span>
      <span>hero drawn in characters from the schwarzschild geodesic equation</span>
    </footer>
  );
}

function Demo({ Comp, h = 420 }: { Comp: Lazy; h?: number }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center border border-line text-[11px] text-faint" style={{ height: h }}>loading…</div>}>
      <Comp />
    </Suspense>
  );
}

// ------------------------------------------------------------------ home
function Hero() {
  const [stage, setStage] = useState(0);
  const [view, setView] = useState<'ascii' | 'render'>('ascii');
  return (
    <section id="top" className="page pt-6 sm:pt-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} className="relative">
        <div className={`transition-opacity duration-1000 ${view === 'ascii' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <AsciiHole />
        </div>
        {view === 'render' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} className="absolute inset-0 flex items-center justify-center">
            <img src="/media/blackhole.webp" alt="The same black hole, ray-traced at full resolution." className="max-h-full w-full object-contain" />
          </motion.div>
        )}
        <div className="absolute bottom-1 right-0 flex gap-3 text-[11px]">
          {(['ascii', 'render'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'text-phos' : 'text-faint hover:text-dim'} aria-pressed={view === v}>
              [ {v === 'ascii' ? 'characters' : 'ray-traced'} ]
            </button>
          ))}
        </div>
      </motion.div>

      <div className="mx-auto mt-4 max-w-[760px] text-center">
        <h1 className="display text-[56px] leading-none sm:text-[96px]">
          <Typed text="Jaden Fix" speed={95} delay={900} onDone={() => setStage(1)} />
        </h1>
        <div className="label mt-5 text-[12px] text-phos">
          {stage >= 1 && <Typed text="software engineer · san francisco" speed={38} cursor onDone={() => setStage(2)} />}
          {stage < 1 && <span className="invisible">software engineer · san francisco</span>}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={stage >= 2 ? { opacity: 1 } : {}} transition={{ duration: 1.4 }} className="mt-6 text-[13px] text-dim">
          platform &amp; applied ai at <a className="link-u text-bone" href="https://www.afterquery.com" target="_blank" rel="noreferrer">afterquery</a> · previously scale ai, roe (yc)
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={stage >= 2 ? { opacity: 1 } : {}} transition={{ duration: 1.4, delay: 0.6 }} className="mt-10 text-[11px] text-faint">
          move your pointer over the sky: it bends the light too
        </motion.p>
      </div>
    </section>
  );
}

function Index() {
  return (
    <section id="work" className="page mt-16">
      <div className="mb-5 flex items-baseline justify-between">
        <div className="label">
          <span className="text-phos">index</span> · papers and projects, each with a live demo below
        </div>
        <div className="hidden text-[11px] text-faint sm:block">press / to jump</div>
      </div>
      <WorkIndex />
    </section>
  );
}

function Rusty() {
  return (
    <div id="rusty" className="grid scroll-mt-24 gap-10 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-4">
        <div className="label">coding agent · rust</div>
        <h3 className="display mt-3 text-[44px] leading-none sm:text-[52px]">
          <a className="link-u" href="https://github.com/jadenfix/rusty" target="_blank" rel="noreferrer">
            rusty
          </a>
        </h3>
        <p className="mt-5 text-[13px] leading-[1.85] text-dim">
          A coding agent I wrote in Rust: one static binary, about 400 tests. A goal only closes when a pinned check passes, and the permission
          classifier reads what <span className="text-bone">npm run</span>, heredocs and <span className="text-bone">ssh</span> will actually execute before
          deciding whether to ask. These are real sessions.
        </p>
        <div className="mt-5 flex items-center gap-4">
          <Chip name="github" href="https://github.com/jadenfix/rusty" />
          <span className="text-[11px] text-faint">← → to switch sessions</span>
        </div>
      </div>
      <div className="lg:col-span-8">
        <RustyPlayer auto />
      </div>
    </div>
  );
}

function Experience() {
  return (
    <section id="experience" className="page">
      <Rule />
      <SectionHead n="03" label="experience" title="Where I’ve worked" />
      <div className="mt-12 md:grid md:grid-cols-12">
        <ol className="md:col-span-9 md:col-start-4">
          {roles.map((r, i) => (
            <Reveal key={r.org} delay={i * 0.06}>
              <li className="grid gap-2 border-t border-line py-6 sm:grid-cols-[170px_1fr] sm:gap-8">
                <div className="text-[12px] text-dim">
                  {r.dates}
                  {r.current && <span className="ml-2 text-phos">● now</span>}
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="display text-[28px] leading-tight">
                      {r.href ? (
                        <a className="link-u" href={r.href} target="_blank" rel="noreferrer">
                          {r.org}
                        </a>
                      ) : (
                        r.org
                      )}
                    </h3>
                    {r.tag && <span className="border border-phos/50 px-1 text-[10px] text-phos">{r.tag}</span>}
                    <span className="text-[12px] text-bone">{r.title}</span>
                  </div>
                  {r.body && <p className="mt-2 max-w-[600px] text-[13px] leading-[1.85] text-dim">{r.body}</p>}
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PaperBlock({ p, i }: { p: Paper; i: number }) {
  return (
    <Reveal className={i === 0 ? 'mt-14' : 'mt-28'}>
      <div id={p.slug} className="label scroll-mt-24">{p.kind}</div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <h3 className="display max-w-[760px] text-[32px] leading-tight sm:text-[40px]">
          <a href={`#/papers/${p.slug}`} className="link-u">
            {p.title}
          </a>
        </h3>
        <div className="flex flex-wrap gap-2">
          {p.links.map((l) => (
            <Chip key={l.label} name={l.label} href={l.href} />
          ))}
          <a href={`#/papers/${p.slug}`} className="chip border-phos/60 text-phos hover:bg-phos/10">
            paper page →
          </a>
        </div>
      </div>
      <p className="mb-8 mt-4 max-w-[720px] text-[13px] leading-[1.85] text-dim">{p.teaser}</p>
      <Demo Comp={p.hero} h={520} />
    </Reveal>
  );
}

function Research() {
  return (
    <section id="research" className="page">
      <Rule />
      <SectionHead n="01" label="research" title="Research">
        Credit assignment for agents, regimes in markets, and how to tell a real gain from noise. Every figure here is live.
      </SectionHead>
      {papers.map((p, i) => (
        <PaperBlock key={p.slug} p={p} i={i} />
      ))}
    </section>
  );
}

const projects: { id: string; name: string; tag: string; href: string; body: string; Comp: Lazy; h: number }[] = [
  {
    id: 'fullstack-bench',
    name: 'FullStack-Bench',
    tag: 'benchmark · python',
    href: 'https://github.com/jadenfix/FullStack-Bench',
    body: 'Can a coding agent ship a full-stack change without paging anyone? Agents work on SimCloud, a simulated cloud with synthetic users on prod and a hash-chained incident log, and are graded on the whole episode. Each square is one real run; switch views and watch passing runs turn out to be unsafe.',
    Comp: BenchMatrix,
    h: 420,
  },
  {
    id: 'spacewind',
    name: 'Spacewind',
    tag: 'physics engine · c11',
    href: 'https://github.com/jadenfix/space-simulation-engine',
    body: 'A dependency-free engine for asking whether a spacecraft can sail on sunlight, solar wind and gravity: Boris-pushed plasma, Parker solar wind, Kerr geodesics, particle-in-cell. Its assurance run passes about 233,000 checks. Below, the same physics in real time.',
    Comp: SpacewindLab,
    h: 560,
  },
  {
    id: 'replaykit',
    name: 'ReplayKit',
    tag: 'debugger · rust',
    href: 'https://github.com/jadenfix/ReplayKit',
    body: 'Time-travel debugging for agent runs. Fork any step, patch it, replay only what’s downstream, and diff against the original.',
    Comp: ReplayDemo,
    h: 560,
  },
  {
    id: 'drl4mm',
    name: 'DRL4MM',
    tag: 'reinforcement learning · python',
    href: 'https://github.com/jadenfix/DRL4MM',
    body: 'A TD3 market maker, trained with the repo’s own code on a day of real LTC/USDT order flow, quoting live in your browser against a FIFO limit order book next to a fixed-midpoint baseline. It matches the Python simulator fill for fill. It does not beat the baseline yet, and the demo says so.',
    Comp: MarketMakerDemo,
    h: 820,
  },
  {
    id: 'inftythink',
    name: 'InftyThink',
    tag: 'reasoning · jax',
    href: 'https://github.com/jadenfix/InftyThink',
    body: 'Reason in bounded segments, fold each into a short summary, and carry only the summaries forward, so peak context is capped by the question plus a few summaries. Below, real traces from the repo’s own pipeline on three GSM8K problems, next to plain chain-of-thought.',
    Comp: InftyThinkDemo,
    h: 620,
  },
];

function Projects() {
  return (
    <section id="projects" className="page">
      <Rule />
      <SectionHead n="02" label="projects" title="Things I’ve built" />
      <div className="mt-14 space-y-28">
        <Reveal>
          <Rusty />
        </Reveal>
        {projects.map((p) => (
          <Reveal key={p.id}>
            <div id={p.id} className="mb-7 grid scroll-mt-24 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="label">{p.tag}</div>
                <h3 className="display mt-3 text-[40px] leading-none">
                  <a className="link-u" href={p.href} target="_blank" rel="noreferrer">
                    {p.name}
                  </a>
                </h3>
              </div>
              <div className="lg:col-span-8">
                <p className="text-[13px] leading-[1.85] text-dim">{p.body}</p>
                <div className="mt-4">
                  <Chip name="github" href={p.href} />
                </div>
              </div>
            </div>
            <Demo Comp={p.Comp} h={p.h} />
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-24 border-t border-line pt-8 md:grid md:grid-cols-12">
        <div className="label md:col-span-3">more on github</div>
        <ul className="mt-4 space-y-3 text-[13px] md:col-span-9 md:mt-0">
          {[
            { name: 'trading', href: 'https://github.com/jadenfix/trading', body: 'Rust bots on Kalshi, with a socket bridge so an agent can drive them.' },
            { name: 'Palette', href: 'https://github.com/jadenfix/palette', body: 'An eval gate with its own statistics engine that can answer pass, fail, or inconclusive.' },
            { name: 'Bayesian CNN', href: 'https://github.com/jadenfix/Bayesian-Neural-Network-for-CIFAR-10-Image-Classification', body: 'A Bayesian convolutional network on CIFAR-10 with TensorFlow Probability.' },
            { name: 'everything else', href: 'https://github.com/jadenfix?tab=repositories', body: 'About a hundred public repositories.' },
          ].map((r) => (
            <li key={r.name} className="flex flex-wrap items-baseline gap-x-4">
              <a href={r.href} target="_blank" rel="noreferrer" className="link-u text-bone">
                {r.name} ↗
              </a>
              <span className="text-dim">{r.body}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function Writing() {
  return (
    <section id="writing" className="page">
      <Rule />
      <SectionHead n="04" label="writing" title="Notes" />
      <div className="mt-12 md:grid md:grid-cols-12">
        <ul className="md:col-span-9 md:col-start-4">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08}>
              <li className="border-t border-line">
                <a href={`#/blog/${p.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[130px_1fr] sm:gap-8">
                  <span className="text-[12px] text-faint">{formatDate(p.date)}</span>
                  <span>
                    <span className="display block text-[26px] leading-tight transition-colors group-hover:text-phos">{p.title}</span>
                    <span className="mt-1.5 block text-[13px] leading-[1.8] text-dim">{p.summary}</span>
                  </span>
                </a>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Tempera() {
  return (
    <section id="tempera" className="page">
      <Rule />
      <SectionHead n="05" label="tempera" title="An agent platform, from first principles">
        Something I’m building on my own time, mostly in Rust. Agents that act in the real world should do it under explicit authority, inside a
        sandbox, with memory they can cite and a receipt for everything consequential.
      </SectionHead>
      <div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {tempera.map((l, i) => (
          <Reveal key={l.label} delay={(i % 3) * 0.08} className={`bg-void p-6 ${i === tempera.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className="label">
              <span className="text-phos">{String(i + 1).padStart(2, '0')}</span> {l.label.toLowerCase()}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {l.items.map((it) => (
                <Chip key={it.name} name={it.name} href={it.href} />
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-[1.85] text-dim">{l.body}</p>
          </Reveal>
        ))}
        <div className="flex items-end bg-panel p-6 sm:col-span-2 lg:col-span-2">
          <p className="label leading-relaxed">
            solid chips link to public repos · <span className="border-b border-dashed border-faint">dashed</span> ones are private for now
          </p>
        </div>
      </div>
    </section>
  );
}

function OpenSource() {
  return (
    <section id="open-source" className="page">
      <Rule />
      <SectionHead n="06" label="open source" title="Merged upstream" />
      <div className="mt-12 md:grid md:grid-cols-12">
        <ul className="md:col-span-9 md:col-start-4">
          {upstream.map((u, i) => (
            <Reveal key={u.href} delay={i * 0.05}>
              <li className="border-t border-line">
                <a href={u.href} target="_blank" rel="noreferrer" className="group grid gap-1 py-4 sm:grid-cols-[250px_1fr_auto] sm:items-baseline sm:gap-6">
                  <span className="text-[12px] text-dim">{u.repo}</span>
                  <span className="text-[13px] text-bone">{u.title}</span>
                  <span className="text-[11px] text-faint transition-colors group-hover:text-phos">merged ↗</span>
                </a>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="mt-16 md:grid md:grid-cols-12">
        <div className="label md:col-span-3">commits i like</div>
        <ul className="mt-4 space-y-3 md:col-span-9 md:mt-0">
          {commits.map((c) => (
            <li key={c.sha} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
              <a href={c.href} target="_blank" rel="noreferrer" className="link-u text-phos">
                {c.sha}
              </a>
              <span className="text-[11px] text-faint">{c.repo}</span>
              <span className="text-dim">{c.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MemoriesSection() {
  return (
    <section id="memories" className="page">
      <Rule />
      <div className="mb-10 flex items-baseline justify-between">
        <div className="label">
          <span className="text-phos">07</span> <span className="mx-1 text-faint">·</span> memories
        </div>
        <div className="text-[11px] text-faint">off the clock</div>
      </div>
      <Memories />
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="page">
      <Rule />
      <div className="mx-auto max-w-[760px] py-10 text-center">
        <h2 className="display text-[42px] leading-[1.05] sm:text-[64px]">
          Building something <em className="italic text-phos">interesting</em>?
          <br />
          My DMs are open.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px]">
          <a className="link-u" href={links.linkedin} target="_blank" rel="noreferrer">
            → linkedin
          </a>
          <a className="link-u" href={links.github} target="_blank" rel="noreferrer">
            → github
          </a>
          <a className="link-u" href={links.email}>
            → email
          </a>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main>
      <Hero />
      <Index />
      <Research />
      <Projects />
      <Experience />
      <Writing />
      <Tempera />
      <OpenSource />
      <MemoriesSection />
      <Contact />
    </main>
  );
}

// ------------------------------------------------------------------ pages
function PaperPage({ paper }: { paper: Paper }) {
  const doc = paperDocs.find((d) => d.slug === paper.slug);
  const i = papers.findIndex((p) => p.slug === paper.slug);
  const next = papers[(i + 1) % papers.length];
  return (
    <main className="page pt-16">
      <a href="#research" className="label link-u">
        ← research
      </a>
      <div className="label mt-10 text-phos">{doc?.status || paper.kind}</div>
      <motion.h1
        key={paper.slug}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
        className="display mt-4 max-w-[900px] text-[42px] leading-[1.04] sm:text-[60px]"
      >
        {doc?.title ?? paper.title}
      </motion.h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {paper.links.map((l) => (
          <Chip key={l.label} name={l.label} href={l.href} />
        ))}
      </div>
      <div className="mt-12">
        <Demo Comp={paper.hero} h={520} />
      </div>
      {doc && (
        <article className="mx-auto mt-16 max-w-[680px]">
          <Markdown source={doc.body} />
        </article>
      )}
      {paper.figures.map((f, k) => (
        <Reveal key={f.title} className="mt-20">
          <div className="mb-5 flex items-baseline gap-3">
            <span className="label text-phos">fig. {k + 2}</span>
            <h2 className="display text-[28px] leading-tight">{f.title}</h2>
          </div>
          <Demo Comp={f.Comp} h={420} />
        </Reveal>
      ))}
      <a href={`#/papers/${next.slug}`} className="group mt-24 block border-t border-line pt-6">
        <span className="label">next paper</span>
        <span className="display mt-2 block text-[28px] transition-colors group-hover:text-phos">{next.title}</span>
      </a>
    </main>
  );
}

function BlogIndex() {
  return (
    <main className="page pt-16">
      <a href="#top" className="label link-u">
        ← home
      </a>
      <h1 className="display mt-8 text-[52px] leading-none sm:text-[72px]">Notes</h1>
      <p className="mt-4 max-w-[520px] text-[13px] leading-[1.85] text-dim">Short pieces on evals, agents, and the statistics underneath them.</p>
      <ul className="mt-14">
        {posts.map((p) => (
          <li key={p.slug} className="border-t border-line">
            <a href={`#/blog/${p.slug}`} className="group grid gap-2 py-7 sm:grid-cols-[150px_1fr] sm:gap-8">
              <span className="text-[12px] text-faint">
                {formatDate(p.date)}
                {p.read && <span className="block">{p.read}</span>}
              </span>
              <span>
                <span className="display block text-[30px] leading-tight transition-colors group-hover:text-phos">{p.title}</span>
                <span className="mt-1.5 block text-[13px] leading-[1.8] text-dim">{p.summary}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

function PostView({ post }: { post: Doc }) {
  const i = posts.findIndex((p) => p.slug === post.slug);
  const next = posts[(i + 1) % posts.length];
  return (
    <main className="page pt-16">
      <article className="mx-auto max-w-[680px]">
        <a href="#/blog" className="label link-u">
          ← notes
        </a>
        <motion.h1
          key={post.slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
          className="display mt-8 text-[42px] leading-[1.04] sm:text-[58px]"
        >
          {post.title}
        </motion.h1>
        <div className="mt-5 text-[12px] text-faint">
          {formatDate(post.date)} {post.read && <>· {post.read}</>}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }} className="mt-12">
          <Markdown source={post.body} />
        </motion.div>
        {posts.length > 1 && (
          <a href={`#/blog/${next.slug}`} className="group mt-20 block border-t border-line pt-6">
            <span className="label">next</span>
            <span className="display mt-2 block text-[26px] transition-colors group-hover:text-phos">{next.title}</span>
          </a>
        )}
      </article>
    </main>
  );
}

export default function App() {
  const route = useRoute();
  let page: ReactNode = <Home />;
  if (route.name === 'blog') page = <BlogIndex />;
  if (route.name === 'post') page = <PostView post={route.post} />;
  if (route.name === 'paper') page = <PaperPage paper={route.paper} />;
  return (
    <div className="grain min-h-screen">
      <Header />
      {page}
      <Footer />
      <CommandBar />
      <Cursor />
    </div>
  );
}
