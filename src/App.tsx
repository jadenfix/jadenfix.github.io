import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AsciiHole from './AsciiHole';
import { commits, links, papers, roles, tempera, upstream } from './content';
import { Chip, Figure, Reveal, Rule, SectionHead, Typed } from './ui';

const nav = [
  { href: '#work', label: 'work' },
  { href: '#research', label: 'research' },
  { href: '#tempera', label: 'tempera' },
  { href: '#projects', label: 'projects' },
  { href: '#open-source', label: 'open source' },
];

function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 ${scrolled ? 'border-b border-line bg-void/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="page flex h-14 items-center justify-between text-[12px]">
        <a href="#top" className="flex items-center gap-2 text-bone">
          <span className="inline-block h-[11px] w-[6px] animate-blink bg-phos" aria-hidden />
          jaden fix
        </a>
        <nav className="hidden items-center gap-7 text-dim md:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-bone">
              {n.label}
            </a>
          ))}
        </nav>
        <a href="#contact" className="text-phos transition-opacity hover:opacity-80">
          contact →
        </a>
      </div>
    </header>
  );
}

function Hero() {
  const [stage, setStage] = useState(0);
  return (
    <section id="top" className="page pt-6 sm:pt-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }}>
        <AsciiHole />
      </motion.div>

      <div className="mx-auto -mt-2 max-w-[760px] text-center sm:-mt-6">
        <div className="label text-phos">
          <Typed text="jaden fix · software engineer · san francisco" speed={42} delay={900} cursor onDone={() => setStage(1)} />
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
          onAnimationComplete={() => stage >= 1 && setStage(2)}
          className="display mt-6 text-[44px] leading-[1.02] sm:text-[72px]"
        >
          I build agents and the systems they <em className="italic text-phos">run on</em>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 1.4 }}
          className="mx-auto mt-7 max-w-[600px] text-[14px] leading-[1.9] text-dim"
        >
          Platform &amp; Applied AI at{' '}
          <a className="link-u text-bone" href="https://www.afterquery.com" target="_blank" rel="noreferrer">
            AfterQuery
          </a>
          , building the post-training data and RL environments frontier models learn from. Before that, agents at Scale AI and founding
          engineer at Roe (YC).
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 1.4, delay: 0.4 }}
          className="mt-14 flex justify-center"
        >
          <a href="#work" className="label animate-breathe" aria-label="Scroll to work">
            scroll ↓
          </a>
        </motion.div>
      </div>

      <Reveal className="mt-24 grid grid-cols-2 gap-y-6 border-y border-line py-6 sm:grid-cols-4">
        {[
          ['now', 'AfterQuery'],
          ['before', 'Scale AI · Roe (YC)'],
          ['writes', 'Rust · Python · JAX · Go'],
          ['studied', 'M.S., Cal Poly'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="label">{k}</div>
            <div className="mt-1.5 text-[13px] text-bone">{v}</div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className="page">
      <Rule />
      <SectionHead n="01" label="work" title="Where I’ve worked">
        I like problems where correctness is measurable. If a claim can be measured, measure it, and write down what it doesn’t show.
      </SectionHead>
      <div className="mt-14 md:grid md:grid-cols-12">
        <ol className="md:col-span-9 md:col-start-4">
          {roles.map((r, i) => (
            <Reveal key={r.org} delay={i * 0.08}>
              <li className="grid gap-2 border-t border-line py-7 sm:grid-cols-[170px_1fr] sm:gap-8">
                <div className="text-[12px] text-dim">
                  {r.dates}
                  {r.current && <span className="ml-2 text-phos">● now</span>}
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="display text-[30px] leading-tight">
                      {r.href ? (
                        <a className="link-u" href={r.href} target="_blank" rel="noreferrer">
                          {r.org}
                        </a>
                      ) : (
                        r.org
                      )}
                    </h3>
                    {r.tag && <span className="text-[11px] text-phos">{r.tag}</span>}
                  </div>
                  <div className="mt-1 text-[13px] text-bone">{r.title}</div>
                  <p className="mt-2 max-w-[600px] text-[13px] leading-[1.85] text-dim">{r.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Research() {
  return (
    <section id="research" className="page">
      <Rule />
      <SectionHead n="02" label="research" title="How agents learn from long trajectories">
        Your agent’s training pipeline may be teaching it to stall. The figure plays one episode twice: once scored by its outcome, once by
        what each step changed.
      </SectionHead>
      <Reveal className="mt-14">
        <Figure caption="fig. 1 · loop-action bias, drawn as a constellation" href={links.constellation} hrefLabel="renderer">
          <img
            src="/media/constellation.webp"
            alt="An agent's episode drawn as a constellation. Outcome-only credit lights the orbit that went nowhere as brightly as the winning path; branch-aware credit turns it red."
            className="w-full"
            loading="lazy"
          />
        </Figure>
      </Reveal>
      <div className="mt-8">
        {papers.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <article className="grid gap-3 border-t border-line py-8 md:grid-cols-12">
              <div className="label md:col-span-3">{p.kind.toLowerCase()}</div>
              <div className="md:col-span-9">
                <h3 className="display text-[28px] leading-tight sm:text-[32px]">{p.title}</h3>
                <p className="mt-3 max-w-[700px] text-[13px] leading-[1.85] text-dim">{p.body}</p>
                <div className="mt-4 flex gap-2">
                  {p.links.map((l) => (
                    <Chip key={l.label} name={l.label} href={l.href} />
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Tempera() {
  return (
    <section id="tempera" className="page">
      <Rule />
      <SectionHead n="03" label="tempera" title="An agent platform, from first principles">
        Something I’m building on my own time, mostly in Rust. Agents that act in the real world should do it under explicit authority,
        inside a sandbox, with memory they can cite and a receipt for everything consequential. Every product exposes one OpenAPI contract;
        the SDKs, CLIs and MCP tools are generated from it, so nothing drifts.
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
      <Reveal className="mt-20 grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <div className="label">demo · palette</div>
          <h3 className="display mt-3 text-[34px] leading-[1.1]">
            A CI gate that knows when it <em className="italic text-phos">doesn’t know</em>
          </h3>
          <p className="mt-4 text-[13px] leading-[1.85] text-dim">
            Palette records what an agent did, turns its failures into datasets, and only lets a change ship when it beats a held-out split and
            the bootstrap says it isn’t overfitting. When the evidence is thin, it says inconclusive and how many more cases it needs.
          </p>
        </div>
        <div className="lg:col-span-7">
          <Figure caption="the gate, running in the browser" href="https://github.com/jadenfix/palette" hrefLabel="palette">
            <video className="w-full opacity-90" src="/media/palette-gate.webm" autoPlay muted loop playsInline preload="metadata" />
          </Figure>
        </div>
      </Reveal>
    </section>
  );
}

const rustyTabs = [
  { key: 'fix', label: 'find and fix', src: '/media/rusty-hero.gif', note: 'Finds two real bugs in a discount module, fixes both, and proves it by running the tests.' },
  { key: 'goal', label: 'goal mode', src: '/media/rusty-goal.gif', note: 'Plans, writes a CLI and its tests, runs them, and can only finish by handing over evidence.' },
  { key: 'swarm', label: 'swarm', src: '/media/rusty-swarm.gif', note: 'Four read-only workers audit four modules in parallel and merge a ranked bug list.' },
];

function Rusty() {
  const [tab, setTab] = useState(rustyTabs[0]);
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-5">
        <div className="label">coding agent · rust</div>
        <h3 className="display mt-3 text-[42px] leading-none">
          <a className="link-u" href="https://github.com/jadenfix/rusty" target="_blank" rel="noreferrer">rusty</a>
        </h3>
        <p className="mt-4 text-[13px] leading-[1.85] text-dim">
          A coding agent in one static Rust binary, with about 400 tests. A goal only closes when a pinned check passes, and its permission
          classifier reads what <span className="text-bone">npm run</span>, heredocs and <span className="text-bone">ssh</span> will actually execute before
          deciding to ask.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[12px]" role="tablist">
          {rustyTabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={t.key === tab.key}
              onClick={() => setTab(t)}
              className={`transition-colors ${t.key === tab.key ? 'text-phos' : 'text-dim hover:text-bone'}`}
            >
              [ {t.label} ]
            </button>
          ))}
        </div>
        <p className="mt-4 min-h-[48px] text-[12.5px] leading-[1.8] text-faint">{tab.note}</p>
      </div>
      <div className="lg:col-span-7">
        <Figure caption="a real session, idle pauses trimmed" href="https://github.com/jadenfix/rusty" hrefLabel="rusty">
          <img key={tab.key} src={tab.src} alt={`rusty: ${tab.label}`} className="w-full" />
        </Figure>
      </div>
    </div>
  );
}

function Bench() {
  const total = 84;
  const hit = 38;
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div className="lg:order-2 lg:col-span-5">
        <div className="label">benchmark · python</div>
        <h3 className="display mt-3 text-[42px] leading-none">
          <a className="link-u" href="https://github.com/jadenfix/FullStack-Bench" target="_blank" rel="noreferrer">FullStack-Bench</a>
        </h3>
        <p className="mt-4 text-[13px] leading-[1.85] text-dim">
          Can an agent ship a full-stack change without paging anyone? Agents work on SimCloud, a simulated cloud with synthetic users on prod
          and a hash-chained incident log, and are graded on the whole episode, not just the final state.
        </p>
      </div>
      <div className="lg:order-1 lg:col-span-7">
        <div className="border border-line bg-panel p-7 sm:p-9">
          <div className="flex items-baseline gap-3">
            <span className="display text-[68px] leading-none text-phos">{hit}</span>
            <span className="display text-[30px] text-faint">/ {total}</span>
          </div>
          <p className="mt-2 max-w-[420px] text-[12.5px] leading-[1.8] text-dim">
            graded runs passed the usual final-state check but failed the whole-episode safety check.
          </p>
          <div className="mt-7 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[5px]">
            {Array.from({ length: total }, (_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.018 }}
                className={`aspect-square ${i < hit ? 'bg-phos/85 shadow-[0_0_10px_rgba(232,169,106,0.35)]' : 'bg-line'}`}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-[11px] text-dim">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-phos/85" /> looked done, wasn’t safe</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-line" /> every other run</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spacewind() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-5">
        <div className="label">physics engine · c11</div>
        <h3 className="display mt-3 text-[42px] leading-none">
          <a className="link-u" href="https://github.com/jadenfix/space-simulation-engine" target="_blank" rel="noreferrer">Spacewind</a>
        </h3>
        <p className="mt-4 text-[13px] leading-[1.85] text-dim">
          A dependency-free engine for asking whether a spacecraft can sail on sunlight, solar wind and gravity: Kerr geodesics, solar wind,
          3D electromagnetic particle-in-cell. Every claim file lists what it does <em className="text-bone">not</em> show. The black hole at the top
          of this page is the same kind of math.
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
          {[
            ['~233k', 'assurance checks'],
            ['0', 'failures'],
            ['1.999', 'measured order'],
          ].map(([v, k]) => (
            <div key={k}>
              <dt className="display text-[28px] leading-none text-bone">{v}</dt>
              <dd className="mt-1 text-[11px] text-dim">{k}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="lg:col-span-7">
        <Figure caption="plasma benchmark convergence, from real solver output" href="https://github.com/jadenfix/space-simulation-engine/tree/main/demo" hrefLabel="reproduce">
          <video className="w-full" src="/media/spacewind-plasma.mp4" autoPlay muted loop playsInline preload="metadata" />
        </Figure>
      </div>
    </div>
  );
}

const more = [
  { name: 'ReplayKit', href: 'https://github.com/jadenfix/ReplayKit', body: 'Time-travel debugging for agent runs. Fork any step, patch it, replay only what’s downstream, and diff.', tag: 'rust' },
  { name: 'DRL4MM', href: 'https://github.com/jadenfix/DRL4MM', body: 'A TD3 market-making agent trading against a FIFO limit order book.', tag: 'python' },
  { name: 'InftyThink', href: 'https://github.com/jadenfix/InftyThink', body: 'A JAX reproduction of bounded-context reasoning: think in segments, carry forward only a summary.', tag: 'jax' },
];

function Projects() {
  return (
    <section id="projects" className="page">
      <Rule />
      <SectionHead n="04" label="projects" title="Things I’ve built">
        Side projects, with the receipts. Work commits live on a different account.
      </SectionHead>
      <div className="mt-16 space-y-28">
        <Reveal><Rusty /></Reveal>
        <Reveal><Bench /></Reveal>
        <Reveal><Spacewind /></Reveal>
        <Reveal>
          <Figure caption="fig. 0 · the same equations as the hero, ray-traced at full resolution" href={links.renderer} hrefLabel="renderer">
            <div className="relative aspect-[16/7] w-full bg-cover bg-center" style={{ backgroundImage: 'url(/media/blackhole-poster.jpg)' }}>
              <img src="/media/blackhole.webp" alt="A ray-traced black hole with a thin glowing disk bent over and under its shadow." className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            </div>
          </Figure>
        </Reveal>
      </div>
      <div className="mt-24 grid gap-px border border-line bg-line md:grid-cols-3">
        {more.map((m, i) => (
          <Reveal key={m.name} delay={i * 0.08} className="bg-void p-6">
            <a href={m.href} target="_blank" rel="noreferrer" className="group block">
              <div className="label">{m.tag}</div>
              <h4 className="display mt-3 text-[26px] leading-none">
                {m.name} <span className="text-faint transition-colors group-hover:text-phos">↗</span>
              </h4>
              <p className="mt-3 text-[12.5px] leading-[1.8] text-dim">{m.body}</p>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function OpenSource() {
  return (
    <section id="open-source" className="page">
      <Rule />
      <SectionHead n="05" label="open source" title="Merged upstream" />
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

function Contact() {
  return (
    <section id="contact" className="page pb-12">
      <Rule />
      <div className="mx-auto max-w-[760px] py-10 text-center">
        <div className="label text-phos">contact</div>
        <h2 className="display mt-6 text-[42px] leading-[1.05] sm:text-[64px]">
          Building something <em className="italic text-phos">interesting</em>?
          <br />
          My DMs are open.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px]">
          <a className="link-u" href={links.linkedin} target="_blank" rel="noreferrer">→ linkedin</a>
          <a className="link-u" href={links.github} target="_blank" rel="noreferrer">→ github</a>
          <a className="link-u" href={links.email}>→ email</a>
        </div>
      </div>
      <footer className="mt-20 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[11px] text-faint">
        <span>© {new Date().getFullYear()} jaden fix</span>
        <span>drawn in characters from the schwarzschild geodesic equation · 37.77°n 122.42°w</span>
      </footer>
    </section>
  );
}

export default function App() {
  return (
    <div className="grain">
      <Header />
      <main>
        <Hero />
        <Work />
        <Research />
        <Tempera />
        <Projects />
        <OpenSource />
        <Contact />
      </main>
    </div>
  );
}
