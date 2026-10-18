import { useEffect, useState, type ReactNode } from 'react';
import { loadBeacon, loadDelft, verifyBeacon, type Beacon, type Delft } from './demos/simulation/data';
import BeaconEvidence from './sim/BeaconEvidence';
import BellAnytime from './sim/BellAnytime';
import PrecisionLine from './sim/PrecisionLine';
import RenderField from './sim/RenderField';
import TwoStreams from './sim/TwoStreams';
import { Chip, Decode, DemoNote, Reveal, Rule } from './ui';

// #/simulation: can you tell, from inside, whether a world is rendered?
// Four instruments on real data, then the three papers they come from.

const REPO = 'https://github.com/jadenfix/simulation-theory';
const PDF = `${import.meta.env.BASE_URL}papers/`;

const simPapers = [
  {
    slug: 'pricing-a-bell-simulator',
    title: 'Pricing a Bell simulator',
    line: 'If a classical machine had to fake a Bell test, what would it cost? Precision, memory, leaks and noise, each with a price and a trial count to catch it.',
    pages: 17,
  },
  {
    slug: 'evidence-a-simulator-can-leave',
    title: 'How much evidence can a simulator leave?',
    line: 'Exact rates for how fast evidence piles up against a restricted simulator, a hard ceiling when the difference lives in one shared world, and what survives optional stopping.',
    pages: 19,
  },
  {
    slug: 'identifiability-and-randomness-as-resources',
    title: 'Identification, evidence caps, and the price of shared randomness',
    line: 'What an observable law can pin down is a different question from what evidence or a fair coin can buy. Three exact finite answers.',
    pages: 19,
  },
];

function Section({ n, label, title, children }: { n: string; label: string; title: string; children: ReactNode }) {
  return (
    <section className="page">
      <Rule />
      <div className="grid gap-6 md:grid-cols-12">
        <Reveal from="left" className="label md:col-span-3">
          <span className="text-phos">{n}</span>
          <span className="mx-2 text-faint">·</span>
          {label}
        </Reveal>
        <div className="md:col-span-9">
          <h2 className="display text-[34px] leading-[1.08] sm:text-[46px]">
            <Decode text={title} delay={0.1} />
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="mt-5 max-w-[640px] text-[14px] leading-[1.85] text-dim">{children}</p>;

function Instrument({ children, how, reveals }: { children: ReactNode; how: string; reveals: string }) {
  return (
    <Reveal className="mt-10">
      <DemoNote how={how} reveals={reveals} />
      <div className="screen">{children}</div>
    </Reveal>
  );
}

const Loading = () => <div className="flex h-[280px] items-center justify-center text-[11px] text-faint">loading the data…</div>;

export default function SimulationPage() {
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [delft, setDelft] = useState<Delft | null>(null);
  const [chain, setChain] = useState<[number, number] | null>(null);

  useEffect(() => {
    let live = true;
    loadBeacon().then((b) => {
      if (!live) return;
      setBeacon(b);
      verifyBeacon(b).then((v) => live && setChain(v), () => {});
    }, () => {});
    loadDelft().then((d) => live && setDelft(d), () => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <main>
      {/* the world, rendered where you look */}
      <section className="relative h-[86vh] min-h-[560px] overflow-hidden bg-void">
        <RenderField className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--c-void))_0%,rgb(var(--c-void)/0.88)_50%,transparent_78%)] sm:bg-[radial-gradient(ellipse_at_20%_85%,rgb(var(--c-void)/0.92),rgb(var(--c-void)/0.55)_38%,transparent_70%)]" />
        <div className="page pointer-events-none relative flex h-full flex-col justify-end pb-14">
          <a href="#simulation-theory" className="label link-u pointer-events-auto w-fit">
            ← home
          </a>
          <div className="label mt-8 text-phos">simulation-theory</div>
          <h1 className="display mt-4 max-w-[820px] text-[44px] leading-[1.02] sm:text-[72px]">
            <Decode text="Does the world render when nobody’s looking?" delay={0.4} />
          </h1>
          <Reveal delay={0.9}>
            <p className="mt-6 max-w-[560px] text-[14px] leading-[1.85] text-dim">
              If it’s done perfectly, you can’t tell. That’s the first theorem, and the dull part. The fun part is everything a cheaper simulator would give away,
              measured here on real randomness and a real Bell test.
            </p>
          </Reveal>
          <Reveal delay={1.2}>
            <p className="mt-8 text-[11px] text-faint">move your cursor to observe. the world forgets whatever you stop watching.</p>
          </Reveal>
        </div>
      </section>

      <Section n="01" label="the boundary" title="A perfect copy leaves nothing to find">
        <P>
          One of these streams is NIST’s randomness beacon: hardware entropy, published once a minute. The other is your browser’s crypto.getRandomValues, a program
          that stretches a little seed entropy into as many bits as you ask for. One of them is literally a simulation. Each keeps a running Bayes factor for “this source is biased”.
        </P>
        <Instrument
          how="Watch both streams for a while, then pick the one you think is the program. Which column is which is shuffled every visit."
          reveals="There is nothing to go on. If a simulator reproduces the observable law exactly, every test has power equal to its size and the Bayes factor is 1 (ST-T01). Everything after this needs a restricted simulator."
        >
          {beacon ? <TwoStreams beacon={beacon} /> : <Loading />}
        </Instrument>
      </Section>

      <Section n="02" label="evidence" title="A cheap one leaves a trail">
        <P>
          So restrict it. Say the renderer is slightly biased. Here are all 131,072 beacon bits{chain ? ', ' : '. '}
          {chain && (
            <>
              and your browser just re-checked {chain[0]} of {chain[1]} SHA-512 commitments that chain each pulse to the next.{' '}
            </>
          )}
          The amber line is the evidence for “biased” as the bits come in. It ends at −6.03 nats, about where fair bits should land, since this test drifts down like −½ ln n. The pale band is a sandwich
          the line can never leave, for any sequence at all, and it pins the evidence to within 0.47 nats.
        </P>
        <Instrument
          how="Drag the lean. The same beacon bits go through a renderer that forces a bit to 1 with probability 2δ. Watch where the line crosses the dashed bar."
          reveals="Evidence grows like n·KL(q‖½) − ½ ln n, and the band says that holds bit by bit, not just on average. Past a lean of about 0.0087 this test catches the renderer 95% of the time at α = 0.01; below that, 131k bits aren’t enough."
        >
          {beacon ? <BeaconEvidence beacon={beacon} /> : <Loading />}
        </Instrument>
      </Section>

      <Section n="03" label="bell" title="The Bell test, read honestly">
        <P>
          In 2015 a Delft team ran the first loophole-free Bell test, with electron spins 1.3 km apart. Each of the 245 trials either wins a game that no classical world
          can win more than 3/4 of the time, or doesn’t. They won 80%, and the published p-value is 0.039. That number assumes 245 was fixed before anyone looked. If
          you allow stopping whenever the data look good, which is how evidence usually gets read, you need a bettor whose winnings stay honest at every step.
        </P>
        <Instrument
          how="It plays once on its own. Scrub or replay to watch the bettor’s winnings trial by trial. Amber is a bettor fixed in advance; the pale dashes are the most any constant bet could have made, picked with hindsight."
          reveals="Even the hindsight ceiling peaks at 7.78, short of the 20 needed to reject at 5%. The violation is real (S = 2.42 ± 0.20), but 245 trials can’t rule out a classical renderer with a small leak under this kind of test. Not evidence for one either."
        >
          {delft ? <BellAnytime delft={delft} /> : <Loading />}
        </Instrument>
      </Section>

      <Section n="04" label="precision" title="Five bits is enough to pass">
        <P>
          Suppose the renderer stores every probability as a fraction with denominator D, a fixed number of bits. That’s an economy a simulator might make. On the
          settings a Bell test uses, it barely shows.
        </P>
        <Instrument
          how="Pick a precision. The ticks are the CHSH values the renderer can hit while still looking like ordinary, slightly noisy physics. Amber ticks land inside what Delft measured."
          reveals="At 5 bits it can sit at S = 5/2, inside Delft’s interval, and no amount of CHSH data separates it from real physics with unknown visibility. A different pair of settings, 0 and π/4, can catch it, but the sufficient count is around 10⁹ trials per setting."
        >
          <PrecisionLine />
        </Instrument>
      </Section>

      <section className="page">
        <Rule />
        <div className="grid gap-6 md:grid-cols-12">
          <Reveal from="left" className="label md:col-span-3">
            <span className="text-phos">05</span>
            <span className="mx-2 text-faint">·</span>
            papers
          </Reveal>
          <div className="md:col-span-9">
            <h2 className="display text-[34px] leading-[1.08] sm:text-[46px]">
              <Decode text="Three papers" delay={0.1} />
            </h2>
            <P>
              Every number above comes from a public claim ledger: each statement has an ID, a type, and a script that re-checks it. The papers say only what the ledger
              proves, and each one ends with what it doesn’t.
            </P>
            <ul className="mt-10">
              {simPapers.map((p) => (
                <Reveal as="li" key={p.slug} className="border-t border-line py-7">
                  <a href={`${PDF}${p.slug}.pdf`} target="_blank" rel="noreferrer" className="group grid grid-cols-[84px_1fr] gap-5 sm:grid-cols-[112px_1fr] sm:gap-7">
                    <span className="relative block overflow-hidden border border-line bg-black">
                      <img
                        src={`${PDF}${p.slug}.jpg`}
                        alt=""
                        loading="lazy"
                        className="block aspect-[453/640] w-full object-cover object-top opacity-80 transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
                      />
                    </span>
                    <span>
                      <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <span className="display text-[24px] leading-tight transition-colors group-hover:text-phos sm:text-[26px]">{p.title}</span>
                        <span className="text-[11px] text-faint">{p.pages} pages · pdf ↗</span>
                      </span>
                      <span className="mt-2 block max-w-[600px] text-[13px] leading-[1.8] text-dim">{p.line}</span>
                    </span>
                  </a>
                </Reveal>
              ))}
            </ul>
            <Reveal className="mt-8 flex flex-wrap gap-2">
              <Chip name="repo" href={REPO} />
              <Chip name="claim ledger" href={`${REPO}/tree/main/claims`} />
              <Chip name="paper sources" href={`${REPO}/tree/main/paper`} />
              <Chip name="why i got into this" href="#/blog/simulation-is-an-eval" />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="page">
        <Rule />
        <Reveal className="mx-auto max-w-[620px] pb-10 text-center">
          <p className="display text-[26px] leading-[1.35] sm:text-[32px]">None of this is evidence for or against simulation.</p>
          <p className="mt-5 text-[13px] leading-[1.85] text-dim">
            It’s a way of asking a vague question precisely enough that data can answer pieces of it. Data: NIST Randomness Beacon 2.0, chain 2 (a U.S. government work);
            B. Hensen et al., loophole-free Bell test, Delft 2015, via{' '}
            <a className="link-u" href="https://doi.org/10.4121/uuid:6e19e9b2-4a2d-40b5-8dd3-a660bf3c0a31" target="_blank" rel="noreferrer">
              4TU.ResearchData
            </a>
            , used under the 4TU terms (attribution, non-commercial).
          </p>
        </Reveal>
      </section>
    </main>
  );
}
