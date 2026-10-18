import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import AsciiHole from './AsciiHole';
import CommandBar from './CommandBar';
import Cursor from './Cursor';
import { Markdown } from './Markdown';
import Memories from './Memories';
import RustyPlayer from './RustyPlayer';
import TimeDial from './TimeDial';
import WorkIndex from './WorkIndex';
import { commits, links, roles, tempera, upstream } from './content';
import { useScramble, useSfTime } from './hooks';
import { formatDate, paperDocs, posts, type Doc } from './md';
import { DUR, EASE } from './motion';
import { useRecede } from './scroll';
import { RouteVeil, ScrollProgress } from './Transitions';
import { Chip, Decode, DemoNote, Readout, Reveal, Rule, SectionHead, Typed } from './ui';

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
const SimulationDemo = demo('SimulationDemo');

// ------------------------------------------------------------------ research
type Paper = {
  slug: string;
  kind: string;
  title: string;
  teaser: string;
  links: { label: string; href: string }[];
  hero: Lazy;
  note: Note;
  figures: { title: string; Comp: Lazy }[];
};

/** what to do with a demo, and what it shows */
type Note = { how: string; reveals: string };

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
    note: {
      how: 'watch rollouts collect, switch the scorer (outcome-only, branch-aware, hindsight, combined), drag p(unlock), run again.',
      reveals:
        'under outcome-only credit the learned policy stalls at the gates and succeeds 0.24 of the time, below the 0.79 prompted baseline; branch-aware and combined learn to unlock (0.98, 1.00), reproducing the paper’s Table 1.',
    },
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
    note: {
      how: 'hover or drag across the chart to read any month, toggle filtered vs smoothed, jump to a crisis preset or drag to zoom, double-click to reset.',
      reveals:
        'smoothed probabilities look prescient because they use the future; filtered ones, the only ones you could have had in real time, react later, and the skill bars show no model beats knowing a bear market is already under way.',
    },
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
    note: {
      how: 'let it play through its phases, slide epsilon (blur) and alpha (time weight), toggle balanced vs unbalanced.',
      reveals:
        'how entropic transport routes a critique’s correction onto specific steps of a trajectory; on the repo’s barely trained latents the critic is still near uniform, so the signal hardly concentrates yet.',
    },
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
function NavLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  const [text, scramble] = useScramble(label);
  return (
    <a
      href={href}
      onMouseEnter={scramble}
      onFocus={scramble}
      aria-current={active ? 'location' : undefined}
      className={`relative transition-colors duration-short hover:text-bone ${active ? 'text-bone' : ''}`}
    >
      {text}
      {/* the section you're in: a short amber underline grows out of the middle */}
      <span
        aria-hidden
        className={`absolute inset-x-0 -bottom-1.5 h-px origin-center bg-phos transition-transform duration-base ease-out ${active ? 'scale-x-100' : 'scale-x-0'}`}
      />
    </a>
  );
}

const NAV_SECTIONS = ['research', 'projects', 'experience', 'writing'];

/** Which top-level section is crossing the middle of the screen (home only). */
function useActiveSection(pageKey: string) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (pageKey !== 'home') return;
    const els = NAV_SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((a) => (a === e.target.id ? null : a));
        }
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => {
      io.disconnect();
      setActive(null);
    };
  }, [pageKey]);
  return active;
}

function Header({ pageKey }: { pageKey: string }) {
  const [scrolled, setScrolled] = useState(false);
  const time = useSfTime();
  const active = useActiveSection(pageKey);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 ${scrolled ? 'border-b border-line bg-void/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="page flex h-14 items-center justify-between gap-4 text-[12px]">
        <a href="#top" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-bone">
          <span className="inline-block h-[11px] w-[6px] animate-blink bg-phos" aria-hidden />
          jaden fix
        </a>
        <nav className="hidden items-center gap-6 text-dim md:flex">
          <NavLink href="#research" label="research" active={active === 'research'} />
          <NavLink href="#projects" label="projects" active={active === 'projects'} />
          <NavLink href="#experience" label="experience" active={active === 'experience'} />
          <NavLink href="#/blog" label="writing" active={active === 'writing' || pageKey === 'blog' || pageKey.startsWith('post:')} />
        </nav>
        <div className="flex items-center gap-4 text-faint sm:gap-5">
          {/* between md and lg the nav needs the room: the dial stays, the clock steps out */}
          <span className="hidden whitespace-nowrap sm:inline md:hidden lg:inline" title="Local time in San Francisco">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-phos/80" />
            sf <Readout key={time} value={time} />
          </span>
          <TimeDial />
          <button
            onClick={() => window.dispatchEvent(new Event('open-command-bar'))}
            className="border border-line px-1.5 py-px text-[11px] text-dim transition-colors hover:border-phos hover:text-phos"
            aria-label="Open navigation (press /)"
          >
            /
          </button>
        </div>
      </div>
      <ScrollProgress show={scrolled} />
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

/** A live demo, on its own patch of midnight (see .screen in index.css): the demos draw in dark palettes at any time of day. */
function Demo({ Comp, h = 420 }: { Comp: Lazy; h?: number }) {
  return (
    <div className="screen">
      <Suspense fallback={<div className="flex items-center justify-center border border-line text-[11px] text-faint" style={{ height: h }}>loading…</div>}>
        <Comp />
      </Suspense>
    </div>
  );
}

// ------------------------------------------------------------------ home
function Hero() {
  const [stage, setStage] = useState(0);
  const [view, setView] = useState<'ascii' | 'render'>('ascii');
  const sky = useRef<HTMLDivElement>(null);
  useRecede(sky);
  return (
    <section id="top" className="page pt-6 sm:pt-10">
      {/* the sky sits a layer back: as you scroll it drifts slower than the page, shrinks a touch and dims */}
      {/* (its own background: the ray-traced views blend into the page colour, inside this layer) */}
      <div ref={sky} className="bg-void will-change-transform">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.develop, ease: EASE.out }} className="relative">
        <div className={`transition-opacity duration-1000 ${view === 'ascii' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <AsciiHole reveal="/media/hero-smooth.webp" />
        </div>
        {view === 'render' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.slow, ease: EASE.out }} className="absolute inset-0 flex items-center justify-center">
            <img
              src="/media/blackhole.webp"
              alt="The same black hole, ray-traced at full resolution."
              className="max-h-full w-full object-contain"
              style={{
                filter: 'invert(var(--ink)) hue-rotate(calc(var(--ink) * 180deg))',
                mixBlendMode: 'var(--blend)' as never,
                // feathered, so the frame's edge never shows against a coloured page
                maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 70%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 70%, transparent 100%)',
              }}
            />
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
      </div>

      <div className="relative z-[1] mx-auto mt-4 max-w-[760px] text-center">
        <h1 className="display text-[56px] leading-none sm:text-[96px]">
          <Typed text="Jaden Fix" speed={95} delay={900} onDone={() => setStage(1)} />
        </h1>
        <div className="label mt-5 text-[12px] text-phos">
          {stage >= 1 && <Typed text="software engineer · san francisco" speed={38} cursor onDone={() => setStage(2)} />}
          {stage < 1 && <span className="invisible">software engineer · san francisco</span>}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={stage >= 2 ? { opacity: 1 } : {}} transition={{ duration: DUR.slow, ease: EASE.out }} className="mt-6 text-[13px] text-dim">
          platform &amp; applied ai at <a className="link-u text-bone" href="https://www.afterquery.com" target="_blank" rel="noreferrer">afterquery</a> · previously scale ai, roe (yc)
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={stage >= 2 ? { opacity: 1 } : {}} transition={{ duration: DUR.slow, ease: EASE.out, delay: 0.6 }} className="mt-10 text-[11px] text-faint">
          move your cursor over the black hole: it reveals the ray-traced view underneath, and bends the starlight around it
        </motion.p>
      </div>
    </section>
  );
}

function Index() {
  return (
    <section id="work" className="page relative z-[1] mt-16">
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
        <DemoNote
          how="let it play or pick a session (arrow keys work)."
          reveals="real recorded sessions of the agent fixing bugs, running goals to verified completion, and compacting context."
        />
        <div className="screen screen-flush">
          <RustyPlayer auto />
        </div>
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
          {roles.map((r) => (
            <Reveal as="li" key={r.org} className="grid gap-2 border-t border-line py-6 sm:grid-cols-[170px_1fr] sm:gap-8">
                <div className="text-[12px] text-dim">
                  <Readout value={r.dates} />
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
          <a href={`#/papers/${p.slug}`} className="chip border-phos/60 text-phos">
            paper page →
          </a>
        </div>
      </div>
      <p className="mb-8 mt-4 max-w-[720px] text-[13px] leading-[1.85] text-dim">{p.teaser}</p>
      <DemoNote {...p.note} />
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

const projects: { id: string; name: string; tag: string; href: string; body: string; Comp: Lazy; h: number; note: Note }[] = [
  {
    id: 'fullstack-bench',
    name: 'FullStack-Bench',
    tag: 'benchmark · python',
    href: 'https://github.com/jadenfix/FullStack-Bench',
    body: 'Can a coding agent ship a full-stack change without paging anyone? Agents work on SimCloud, a simulated cloud with synthetic users on prod and a hash-chained incident log, and are graded on the whole episode. Each square is one real run; switch views and watch passing runs turn out to be unsafe.',
    Comp: BenchMatrix,
    note: {
      how: 'switch final state, whole episode and safe success; hover or tap a square for that run’s checks.',
      reveals: '38 of 83 graded runs that look finished under final-state grading fail the whole-episode safety check.',
    },
    h: 420,
  },
  {
    id: 'spacewind',
    name: 'Spacewind',
    tag: 'physics engine · c11',
    href: 'https://github.com/jadenfix/space-simulation-engine',
    body: 'A dependency-free engine for asking whether a spacecraft can sail on sunlight, solar wind and gravity: Boris-pushed plasma, Parker solar wind, Kerr geodesics, particle-in-cell. Its assurance run passes about 233,000 checks. Below, the same physics in real time.',
    Comp: SpacewindLab,
    note: {
      how: 'pick a mode; in magnetosphere drag to rotate and set energy, pitch angle and particle type; in solar wind change the coronal temperature and toggle the sails.',
      reveals: 'trapped particles gyrate, bounce and drift with periods that match theory live; a hotter corona gives a faster wind and a looser spiral; sails spiral a craft outward.',
    },
    h: 560,
  },
  {
    id: 'simulation-theory',
    name: 'simulation-theory',
    tag: 'theory · python',
    href: 'https://github.com/jadenfix/simulation-theory',
    body: 'What could you actually learn about whether the world is simulated? If a simulation reproduces the same observable law as ordinary physics, nothing: the Bayes factor is exactly 1. The repo maps where that boundary bends, with typed theorems, model results and finite checks. Below, run the experiments yourself.',
    Comp: SimulationDemo,
    note: {
      how: 'on the evidence tab choose same law, biased or coarsened and watch the log Bayes factor; on the bell test tab replay the real Delft trials.',
      reveals: 'a simulation with the same observable law never accumulates evidence; a restricted one is caught at its KL rate; the real Bell data pass the S = 2 bound that no local classical simulation can.',
    },
    h: 600,
  },
  {
    id: 'replaykit',
    name: 'ReplayKit',
    tag: 'debugger · rust',
    href: 'https://github.com/jadenfix/ReplayKit',
    body: 'Time-travel debugging for agent runs. Fork any step, patch it, replay only what’s downstream, and diff against the original.',
    Comp: ReplayDemo,
    note: {
      how: 'let the tour run, or pick a preset patch or click a span to fork it, then read the plan and the diff.',
      reveals: 'only downstream spans re-run while the rest stay cached, and ReplayKit’s real limits (blocked executors) show plainly.',
    },
    h: 560,
  },
  {
    id: 'drl4mm',
    name: 'DRL4MM',
    tag: 'reinforcement learning · python',
    href: 'https://github.com/jadenfix/DRL4MM',
    body: 'A TD3 market maker, trained with the repo’s own code on a day of real LTC/USDT order flow, quoting live in your browser against a FIFO limit order book next to a fixed-midpoint baseline. It matches the Python simulator fill for fill. It does not beat the baseline yet, and the demo says so.',
    Comp: MarketMakerDemo,
    note: {
      how: 'toggle the trained TD3 policy vs fixed midpoint quotes, pause or step, move to the next slice.',
      reveals: 'a trained TD3 market maker quoting on real LTC/USDT order flow, matching the Python simulator fill for fill; it does not beat tuned fixed quotes yet.',
    },
    h: 820,
  },
  {
    id: 'inftythink',
    name: 'InftyThink',
    tag: 'reasoning · jax',
    href: 'https://github.com/jadenfix/InftyThink',
    body: 'Reason in bounded segments, fold each into a short summary, and carry only the summaries forward, so peak context is capped by the question plus a few summaries. Below, real traces from the repo’s own pipeline on three GSM8K problems, next to plain chain-of-thought.',
    Comp: InftyThinkDemo,
    note: {
      how: 'pick a problem and watch both lanes stream.',
      reveals: 'InftyThink keeps its context bounded by short summaries while chain-of-thought’s context grows with the trace; on these short problems plain chain-of-thought is actually shorter, and summaries from a small untrained model ramble.',
    },
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
            <DemoNote {...p.note} />
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
          {posts.map((p) => (
            <Reveal as="li" key={p.slug} className="border-t border-line">
                <a href={`#/blog/${p.slug}`} className="group grid gap-2 py-6 sm:grid-cols-[130px_1fr] sm:gap-8">
                  <span className="text-[12px] text-faint">{formatDate(p.date)}</span>
                  <span>
                    <span className="display block text-[26px] leading-tight transition-colors group-hover:text-phos">{p.title}</span>
                    <span className="mt-1.5 block text-[13px] leading-[1.8] text-dim">{p.summary}</span>
                  </span>
                </a>
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
          <Reveal key={l.label} className={`bg-void p-6 ${i === tempera.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <div className="label">
              <Readout value={String(i + 1).padStart(2, '0')} className="text-phos" /> {l.label.toLowerCase()}
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
          {upstream.map((u) => (
            <Reveal as="li" key={u.href} className="border-t border-line">
                <a href={u.href} target="_blank" rel="noreferrer" className="group grid gap-1 py-4 sm:grid-cols-[250px_1fr_auto] sm:items-baseline sm:gap-6">
                  <span className="text-[12px] text-dim">{u.repo}</span>
                  <span className="text-[13px] text-bone">{u.title}</span>
                  <span className="text-[11px] text-faint transition-colors group-hover:text-phos">merged ↗</span>
                </a>
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
        <Reveal>
          <h2 className="display text-[42px] leading-[1.05] sm:text-[64px]">
            Building something <em className="italic text-phos">interesting</em>?
            <br />
            My DMs are open.
          </h2>
        </Reveal>
        <Reveal delay={0.25} className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px]">
          <a className="link-u" href={links.linkedin} target="_blank" rel="noreferrer">
            → linkedin
          </a>
          <a className="link-u" href={links.github} target="_blank" rel="noreferrer">
            → github
          </a>
          <a className="link-u" href={links.email}>
            → email
          </a>
        </Reveal>
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
      <h1 className="display mt-4 max-w-[900px] text-[42px] leading-[1.04] sm:text-[60px]">
        <Decode key={paper.slug} text={doc?.title ?? paper.title} delay={0.3} />
      </h1>
      <Reveal delay={0.4} className="mt-6 flex flex-wrap gap-2">
        {paper.links.map((l) => (
          <Chip key={l.label} name={l.label} href={l.href} />
        ))}
      </Reveal>
      <Reveal delay={0.5} className="mt-12">
        <DemoNote {...paper.note} />
        <Demo Comp={paper.hero} h={520} />
      </Reveal>
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
      <h1 className="display mt-8 text-[52px] leading-none sm:text-[72px]">
        <Decode text="Notes" delay={0.3} speed={60} />
      </h1>
      <Reveal delay={0.35}>
        <p className="mt-4 max-w-[520px] text-[13px] leading-[1.85] text-dim">Short pieces on evals, agents, and the statistics underneath them.</p>
      </Reveal>
      <ul className="mt-14">
        {posts.map((p) => (
          <Reveal as="li" delay={0.4} key={p.slug} className="border-t border-line">
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
          </Reveal>
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
        <h1 className="display mt-8 text-[42px] leading-[1.04] sm:text-[58px]">
          <Decode key={post.slug} text={post.title} delay={0.3} />
        </h1>
        <Reveal delay={0.4} className="mt-5 text-[12px] text-faint">
          {formatDate(post.date)} {post.read && <>· {post.read}</>}
        </Reveal>
        <Reveal key={post.slug} delay={0.55} className="mt-12">
          <Markdown source={post.body} />
        </Reveal>
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
  let pageKey = 'home';
  if (route.name === 'blog') {
    page = <BlogIndex />;
    pageKey = 'blog';
  }
  if (route.name === 'post') {
    page = <PostView post={route.post} />;
    pageKey = `post:${route.post.slug}`;
  }
  if (route.name === 'paper') {
    page = <PaperPage paper={route.paper} />;
    pageKey = `paper:${route.paper.slug}`;
  }
  return (
    // framer-motion follows the OS reduced-motion setting everywhere
    <MotionConfig reducedMotion="user">
      <div className="grain min-h-screen">
        <Header pageKey={pageKey} />
        <div key={pageKey}>{page}</div>
        <Footer />
        <CommandBar />
        <Cursor />
        <RouteVeil pageKey={pageKey} />
      </div>
    </MotionConfig>
  );
}
