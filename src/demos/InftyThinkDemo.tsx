import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ContextBar, SawChart, Stream } from './infty/parts';
import { cotAt, cotCurve, inftyAt, inftyCurve, loadTraces, sumLen, upTo, type Problem, type Traces } from './infty/trace';
import { useOnScreen, useReducedMotion } from './orbit/hooks';

const TOK_PER_S = 46; // replay speed, both lanes on one clock of generated tokens
const HOLD_MS = 4200;

const BTN = 'whitespace-nowrap py-0.5 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

function Lane({ title, tag, children }: { title: string; tag: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[12px] text-bone">{title}</span>
        <span className="shrink-0 text-[10px] lowercase tracking-[0.14em] text-faint">{tag}</span>
      </div>
      {children}
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] lowercase tracking-[0.14em] text-dim">{k}</div>
      <div className={`mt-0.5 font-serif text-[22px] leading-none tabular-nums ${accent ? 'text-phos' : 'text-bone'}`}>{v}</div>
    </div>
  );
}

function Verdict({ answer, gold, correct }: { answer: string; gold: string; correct: boolean }) {
  return (
    <span>
      extracted <span className="text-bone">{answer || 'nothing'}</span> · gold {gold} ·{' '}
      <span className={correct ? 'text-[#8fb59a]' : 'text-[#ec5c52]'}>{correct ? 'correct' : 'wrong'}</span>
    </span>
  );
}

const PANE = 'relative mt-3 flex h-[118px] flex-col overflow-hidden border border-line/70 bg-panel px-2 py-1.5 text-[10.5px] leading-[1.5]';
// clipped lines at the top of a bottom-anchored text area fade out instead of showing half a glyph
const FADE = { maskImage: 'linear-gradient(to bottom, transparent, #000 16px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 16px)' };

export default function InftyThinkDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();
  const [data, setData] = useState<Traces | null>(null);
  const [failed, setFailed] = useState(false);
  const [pi, setPi] = useState(0);
  const picked = useRef(false); // once the reader picks a problem, stop cycling
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const [run, setRun] = useState(0); // bumps to restart
  const [g, setG] = useState(0);
  const gRef = useRef(0); // the clock's own copy, so a resume continues where it paused

  useEffect(() => {
    let live = true;
    loadTraces().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const p: Problem | null = data?.problems[pi] ?? null;
  const n = p ? Math.max(p.infty.total, p.cot.total) : 1;
  const count = data?.problems.length ?? 0;
  const shown = userPlaying === null && !playing ? n : g; // reduced motion starts on the finished run

  // the clock: advance generated tokens while visible and playing, hold at the end, then the next problem
  useEffect(() => {
    if (!p || !playing || !visible) return;
    let raf = 0;
    let hold = 0;
    let last = performance.now();
    let cur = gRef.current >= n ? 0 : gRef.current;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (cur < n) {
        cur = Math.min(n, cur + TOK_PER_S * dt);
        gRef.current = cur;
        setG(Math.floor(cur));
      } else {
        hold += dt * 1000;
        if (hold > HOLD_MS) {
          hold = 0;
          cur = 0;
          gRef.current = 0;
          setG(0);
          if (!picked.current && count > 1) setPi((i) => (i + 1) % count);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [p, playing, visible, n, run, count]);

  const restart = () => {
    gRef.current = 0;
    setG(0);
    setRun((r) => r + 1);
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[12px]">
      <div className="flex items-center gap-1.5" role="group" aria-label="GSM8K problem">
        <span className="text-[11px] text-faint">
          <span className="text-dim">gsm8k</span> <span className="hidden sm:inline">test</span>
        </span>
        {(data?.problems ?? []).map((q, i) => (
          <button
            key={q.id}
            type="button"
            aria-pressed={pi === i}
            aria-label={`Problem ${q.id}`}
            onClick={() => {
              picked.current = true;
              setPi(i);
              setUserPlaying(true);
              restart();
            }}
            className={`${BTN} ${pi === i ? 'text-phos' : 'text-dim hover:text-bone'}`}
          >
            [#{q.id}]
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button type="button" aria-pressed={!playing} disabled={!p} onClick={() => setUserPlaying(!playing)} className={`${BTN} text-dim hover:text-bone`}>
          [ {playing ? 'pause' : 'play'} ]
        </button>
        <button
          type="button"
          disabled={!p}
          onClick={() => {
            setUserPlaying(true);
            restart();
          }}
          className={`${BTN} text-dim hover:text-bone`}
        >
          [ replay ]
        </button>
      </div>
    </div>
  );

  if (!data || !p) {
    return (
      <div ref={wrapRef} className="font-mono text-bone">
        {header}
        <div className="mt-3 flex h-[540px] items-center justify-center border border-line bg-void text-[11px] text-faint">
          {failed ? 'could not load the recorded traces' : 'loading recorded traces…'}
        </div>
      </div>
    );
  }

  const { cfg } = data;
  const steps = p.infty.steps;

  // InftyThink lane
  const iS = inftyAt(steps, shown);
  const iLen = sumLen(iS.parts);
  const iCurve = upTo(inftyCurve(steps), shown);
  const iPeak = Math.round(iCurve.reduce((m, [, b]) => Math.max(m, b), 0));
  const iGen = Math.min(shown, p.infty.total);
  const step = steps[iS.i];
  const carried = steps.filter((s, k) => s.k === 'summary' && k < iS.i); // summaries already written
  const segOf = (t: number) => steps.find((s) => s.k === 'segment' && s.t === t);
  const fold = step.k === 'summary' ? iS.done / Math.max(1, step.tok.length) : 0;
  const nSum = steps.filter((s) => s.k === 'summary').length;
  const iDone = iS.finished && shown >= p.infty.total;
  const iNote = iDone ? (
    <Verdict answer={p.infty.answer} gold={p.gold} correct={p.infty.correct} />
  ) : step.k === 'segment' ? (
    `segment ${step.t}: ${iS.done} of up to ${cfg.K} tokens, conditioned on the question and ${carried.length} summar${carried.length === 1 ? 'y' : 'ies'}`
  ) : step.k === 'summary' ? (
    `summary ${step.t}: folding segment ${step.t} (${segOf(step.t)?.tok.length ?? 0} tokens) into ${iS.done} of up to ${cfg.S}`
  ) : (
    `final answer from the question and ${nSum} summaries; no segment is carried`
  );

  // vanilla lane
  const c = cotAt(p.cot.prompt, p.cot.total, shown, cfg.maxSeq);
  const cLen = sumLen(c.parts);
  const cCurve = upTo(cotCurve(p.cot.prompt, p.cot.total, cfg.maxSeq), shown);
  const cPeak = Math.round(cCurve.reduce((m, [, b]) => Math.max(m, b), 0));
  const cDone = shown >= p.cot.total;
  const cNote = cDone ? (
    <Verdict answer={p.cot.answer} gold={p.gold} correct={p.cot.correct} />
  ) : c.dropped > 0 ? (
    `window full: the first ${c.dropped} tokens, the question${c.dropped >= p.cot.prompt ? '' : ' partly'} included, have slid out`
  ) : (
    `every generated token stays in context (${c.gen} of up to ${cfg.cotBudget})`
  );

  const fullPeak = Math.max(...inftyCurve(steps).map(([, b]) => b));

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      {header}
      <p className="mt-2 line-clamp-2 text-[11px] leading-[1.55] text-dim" title={p.q}>
        <span className="text-[#c4ccde]">q</span> {p.q}
      </p>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] border border-line bg-void md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="border-b border-line md:border-b-0 md:border-r">
          <Lane title="vanilla chain-of-thought" tag={`b2 · capped ${cfg.cotBudget}`}>
            <div className={`${PANE} justify-end whitespace-pre-wrap break-words`} style={FADE} aria-hidden>
              <Stream tok={p.cot.tok} n={c.gen} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-faint">
              <span>context, scaled to max_seq_len {cfg.maxSeq}</span>
              <span className="tabular-nums text-dim">{cLen}</span>
            </div>
            <div className="mt-1.5">
              <ContextBar parts={c.parts} peak={cPeak} max={cfg.maxSeq} />
            </div>
            <p className="mt-2 h-[32px] text-[10.5px] leading-[1.55] text-faint">{cNote}</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <Stat k="generated" v={String(c.gen)} />
              <Stat k="context" v={String(cLen)} />
              <Stat k="peak" v={String(cPeak)} />
            </div>
          </Lane>
        </div>
        <div>
          <Lane title="inftythink" tag={`m1 · K${cfg.K} S${cfg.S} T${cfg.T}`}>
            <div className={PANE} aria-hidden>
              <div className="shrink-0">
                {carried.map((s) => (
                  <div key={s.t} className="flex gap-2 text-phos">
                    <span className="shrink-0 text-phos/60">s{s.t}</span>
                    <span className="min-w-0 truncate">{s.tok.join('').trim()}</span>
                    <span className="shrink-0 tabular-nums text-phos/60">{s.tok.length}</span>
                  </div>
                ))}
              </div>
              <div className="mt-0.5 flex min-h-0 flex-1 flex-col justify-end overflow-hidden whitespace-pre-wrap break-words" style={FADE}>
                {step.k === 'segment' && (
                  <div>
                    <Stream tok={step.tok} n={iS.done} />
                  </div>
                )}
                {step.k === 'summary' && (
                  <>
                    <div style={{ opacity: 1 - 0.65 * fold }}>
                      <Stream tok={segOf(step.t)?.tok ?? []} n={segOf(step.t)?.tok.length ?? 0} recent="text-faint" />
                    </div>
                    <div className="mt-0.5 text-phos">
                      <span className="text-phos/60">s{step.t} </span>
                      <Stream tok={step.tok} n={iS.done} recent="text-phos" old="text-phos/80" />
                    </div>
                  </>
                )}
                {step.k === 'final' && (
                  <div>
                    <span className="text-faint">&lt;FINAL&gt; The answer is:</span>
                    <Stream tok={step.tok} n={iS.done} recent="text-bone" old="text-bone/80" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-faint">
              <span>context, same scale</span>
              <span className="tabular-nums text-phos">{iLen}</span>
            </div>
            <div className="mt-1.5">
              <ContextBar parts={iS.parts} peak={iPeak} max={cfg.maxSeq} />
            </div>
            <p className="mt-2 h-[32px] text-[10.5px] leading-[1.55] text-faint">{iNote}</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <Stat k="generated" v={String(iGen)} />
              <Stat k="context" v={String(iLen)} accent />
              <Stat k="peak" v={String(iPeak)} accent />
            </div>
          </Lane>
        </div>
      </div>

      <div className="border-x border-b border-line px-3 pb-2 pt-3 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-[10px] lowercase tracking-[0.14em] text-dim">
          <span>context vs tokens generated</span>
          <span className="normal-case tracking-normal text-faint">
            <span className="inline-block h-px w-3 bg-bone/60 align-middle" /> vanilla <span className="ml-2 inline-block h-px w-3 bg-phos align-middle" /> inftythink
            <span className="ml-3 hidden sm:inline">
              <span className="inline-block h-[6px] w-[6px] bg-ice align-middle" /> question <span className="ml-1 inline-block h-[6px] w-[6px] bg-dim align-middle" /> reasoning{' '}
              <span className="ml-1 inline-block h-[6px] w-[6px] bg-phos align-middle" /> summary
            </span>
          </span>
        </div>
        <div className="mt-2 h-[112px]">
          <SawChart cot={cCurve} infty={iCurve} n={n} maxSeq={cfg.maxSeq} peak={iDone ? fullPeak : 0} />
        </div>
      </div>

      <p className="sr-only" aria-live="off">
        {`GSM8K test problem ${p.id}: ${p.q} Gold answer ${p.gold}. InftyThink generated ${p.infty.total} tokens over ${p.infty.steps.filter((s) => s.k === 'segment').length} segments, peak context ${fullPeak} tokens, answered ${p.infty.answer || 'nothing'}, ${p.infty.correct ? 'correct' : 'wrong'}. Vanilla chain of thought generated ${p.cot.total} tokens, peak context ${p.cot.peak}, answered ${p.cot.answer || 'nothing'}, ${p.cot.correct ? 'correct' : 'wrong'}.`}
      </p>

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-[1.75] text-faint">
        Real outputs: {data.model.replace(/^.*\//, '')} on {count} GSM8K test problem{count === 1 ? '' : 's'}, generated offline on a CPU with the repo&apos;s own run_iterative_reasoning (K {cfg.K}, S {cfg.S}, T {cfg.T},
        budget {cfg.budget}, {cfg.conditioning}) and generate_vanilla_cot at baseline B2&apos;s matched {cfg.cotBudget}, replayed here token by token with exact token counts. The repo&apos;s JAX model ships no
        checkpoint, so this pretrained model stands in behind the same generate() call, untrained on the summary format; the loop has no early stop, so InftyThink runs all T rounds.
      </p>
    </div>
  );
}
