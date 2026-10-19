import { useEffect, useMemo, useRef, useState } from 'react';
import { QuoteChart, Trace } from './mm/quotes';
import { loadCore, loadSlice, Session, SYMBOLS, type Index, type Side, type Sym } from './mm/session';
import type { AgentFile } from './mm/replay';
import { useOnScreen, useReducedMotion } from './orbit/hooks';

const STEP_MS = 250; // one market second per frame: 4x real time

const BTN = 'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

const signed = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;
const ci = (c: [number, number], d = 2) => `[${signed(c[0], d)}, ${signed(c[1], d)}]`;
const short = (s: Sym) => s.slice(0, 3).toLowerCase();
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function verdict(diff: number, c: [number, number], p: number) {
  const lead = diff >= 0 ? 'agent' : 'baseline';
  if (c[0] > 0 && p < 0.05) return 'the agent beats the best baseline on this instrument';
  if (c[1] < 0 && p < 0.05) return 'the best baseline beats the agent on this instrument';
  if (c[0] > 0 || c[1] < 0) return `the ${lead} is ahead and the bootstrap interval excludes zero, but the day-level sign-flip test is not significant, so this is not a reliable difference`;
  return `no significant difference: the ${lead} is ahead by ${Math.abs(diff).toFixed(2)} USDT/h but the interval spans zero`;
}

export default function MarketMakerDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef, '300px');
  const reduce = useReducedMotion();
  const [core, setCore] = useState<{ index: Index; agent: AgentFile } | null>(null);
  const [failed, setFailed] = useState(false);
  const [sym, setSym] = useState<Sym>('BTCUSDT');
  const [sliceK, setSliceK] = useState(0);
  const [sess, setSess] = useState<Session | null>(null);
  const [tick, setTick] = useState(0);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const running = playing && visible && sess !== null;

  useEffect(() => {
    if (!seen || core) return;
    let live = true;
    loadCore().then(
      (c) => live && setCore(c),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [seen, core]);

  const info = core?.index.instruments[sym];
  useEffect(() => {
    if (!core || !info) return;
    let live = true;
    const f = info.files[sliceK % info.files.length];
    loadSlice(f.file).then(
      (s) => {
        if (!live) return;
        const next = new Session(s, core.agent, info.baseline);
        next.advance(1);
        setSess(next);
        setTick(0);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [core, info, sliceK]);

  useEffect(() => {
    if (!running || !sess || !info) return;
    const id = window.setInterval(() => {
      if (sess.done) {
        setSliceK((k) => (k + 1) % info.files.length);
        return;
      }
      sess.advance(1);
      setTick((t) => t + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [running, sess, info]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const frame = useMemo(() => (sess ? { history: sess.history.slice(), stats: sess.stats(), step: sess.step } : null), [sess, tick]);

  const pick = (s: Sym) => {
    if (s === sym) return;
    setSess(null);
    setSym(s);
    setSliceK(0);
  };
  const stepOnce = () => {
    if (!sess || sess.done) return;
    sess.advance(1);
    setTick((t) => t + 1);
  };
  const decimals = sess ? Math.max(0, Math.round(-Math.log10(sess.slice.tick))) : 2;
  const last = frame?.history[frame.history.length - 1];
  const bpsFrom = (v: number | null) => (v === null || !last ? '…' : `${signed(((v - last.mid) / last.mid) * 1e4, 1)}`);
  const T = info?.test;
  const files = info?.files ?? [];
  const label = info?.baseline.label ?? 'best baseline';

  const rows: [string, (s: Side) => string][] = [
    ['mean pnl / hour', (s) => `${signed(s.pnl_mean)} ${ci(s.pnl_mean_ci)}`],
    ['sharpe-like / hour', (s) => `${signed(s.sharpe)} ${ci(s.sharpe_ci)}`],
    ['fills / hour', (s) => s.fills_per_hour.toFixed(1)],
    ['mean |inventory|', (s) => `${s.mean_abs_inv_quotes.toFixed(2)} q`],
    ['5 s markout', (s) => (Number.isFinite(s.markout_5s_bps) ? `${signed(s.markout_5s_bps, 2)} bps` : '…')],
  ];

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[12px]">
        <div className="flex gap-3" role="group" aria-label="Instrument">
          {SYMBOLS.map((s) => (
            <button key={s} type="button" aria-pressed={sym === s} onClick={() => pick(s)} className={`${BTN} ${sym === s ? 'text-phos' : 'text-dim hover:text-bone'}`}>
              [ {short(s)} ]
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button type="button" aria-pressed={!playing} onClick={() => setUserPlaying(!playing)} className={`${BTN} text-dim hover:text-bone`}>
            [ {playing ? 'pause' : 'play'} ]
          </button>
          <button type="button" onClick={stepOnce} disabled={playing || !sess} className={`${BTN} ${playing || !sess ? 'text-faint' : 'text-dim hover:text-bone'}`}>
            [ step ]
          </button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" role="group" aria-label="Held-out slice">
        <span className="text-faint">held-out slice</span>
        {files.map((f, k) => (
          <button key={f.file} type="button" aria-pressed={sliceK === k} onClick={() => setSliceK(k)} className={`${BTN} ${sliceK === k ? 'text-bone' : 'text-dim hover:text-bone'}`}>
            [ {f.week} · {f.start_utc.toLowerCase()} ]
          </button>
        ))}
      </div>

      <div className="mt-2 border border-line bg-void">
        <div className="relative h-[200px] px-3 pb-2 pt-6 sm:h-[230px]">
          <div className="pointer-events-none absolute left-3 right-3 top-2 flex flex-wrap justify-between gap-x-3 text-[10px] lowercase tracking-[0.12em] text-faint">
            <span>
              {short(sym)}usdt perp · <span className="text-phos">━ agent</span> · <span className="text-ice">- - {label}</span> · ● bought ○ sold
            </span>
            {sess && (
              <span className="tabular-nums tracking-normal">
                {clock(sess.step)} / {clock(sess.total)}
              </span>
            )}
          </div>
          <div className="h-full">
            {frame && frame.history.length ? (
              <QuoteChart history={frame.history} decimals={decimals} />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-faint">{failed ? 'replay data unavailable' : 'loading recorded flow…'}</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-line">
          <div className="h-[86px] border-r border-line px-3 py-2">{frame && <Trace history={frame.history} field="inv" label="inventory (quotes)" fmt={(v) => signed(v, 1)} />}</div>
          <div className="h-[86px] px-3 py-2">{frame && <Trace history={frame.history} field="pnl" label="pnl usdt" fmt={(v) => signed(v, 2)} />}</div>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-x border-b border-line text-[11px] sm:grid-cols-4">
        {(
          [
            ['agent quotes, bps from mid', last ? `${bpsFrom(last.agent.bid)} / ${bpsFrom(last.agent.ask)}` : '…', true],
            ['baseline quotes, bps from mid', last ? `${bpsFrom(last.base.bid)} / ${bpsFrom(last.base.ask)}` : '…', false],
            ['agent pnl · fills · inv', frame ? `${signed(frame.stats.agent.pnl)} · ${frame.stats.agent.fills} · ${signed(frame.stats.agent.inv, 1)}` : '…', true],
            ['baseline pnl · fills · inv', frame ? `${signed(frame.stats.base.pnl)} · ${frame.stats.base.fills} · ${signed(frame.stats.base.inv, 1)}` : '…', false],
          ] as [string, string, boolean][]
        ).map(([k, v, accent], i) => (
          <div key={k} className={`min-w-0 px-3 py-2 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}>
            <dt className="text-[10px] lowercase tracking-[0.12em] text-dim sm:truncate">{k}</dt>
            <dd className={`mt-1 truncate font-serif text-[18px] leading-none tabular-nums ${accent ? 'text-phos' : 'text-ice'}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {T && info && (
        <div className="mt-4 text-[11px]" aria-label="Held-out evaluation">
          <div className="text-[10px] lowercase tracking-[0.14em] text-dim">
            held-out test · {short(sym)} · {T.days} days, {T.episodes} hours{T.seen_in_training ? '' : ' · never seen in training'}
          </div>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse tabular-nums">
              <thead>
                <tr className="text-left text-[10px] lowercase text-faint">
                  <th className="py-1 pr-2 font-normal" />
                  <th className="py-1 pr-2 font-normal text-phos">agent</th>
                  <th className="py-1 font-normal text-ice">{label}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, f]) => (
                  <tr key={k} className="border-t border-line">
                    <td className="py-1 pr-2 text-dim">{k}</td>
                    <td className="py-1 pr-2 text-bone">{f(T.agent)}</td>
                    <td className="py-1 text-bone">{f(T.baseline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 leading-[1.7] text-bone">
            agent − baseline: {signed(T.diff_mean)} USDT/h, 95% day-block bootstrap CI {ci(T.diff_ci95)}, sign-flip p = {T.p_sign_flip.toFixed(3)}: {verdict(T.diff_mean, T.diff_ci95, T.p_sign_flip)}.
            {T.ex_post && (
              <span className="text-dim">
                {' '}
                Against the baseline that did best on these test days ({T.ex_post.label}, picked with hindsight): {signed(T.ex_post.diff_mean)} USDT/h{' '}
                {ci(T.ex_post.diff_ci95)}, p = {T.ex_post.p_sign_flip.toFixed(3)}.
              </span>
            )}
            {core && (
              <span className="text-dim">
                {' '}
                All four instruments pooled: the agent made {signed(core.index.pooled.agent.pnl_mean)} USDT/h {ci(core.index.pooled.agent.pnl_mean_ci)} against{' '}
                {signed(core.index.pooled.best_baseline.pnl_mean)} {ci(core.index.pooled.best_baseline.pnl_mean_ci)} for the validation-chosen baselines; difference{' '}
                {signed(core.index.pooled.vs.diff_mean)} {ci(core.index.pooled.vs.diff_ci95)}, p = {core.index.pooled.vs.p_sign_flip.toFixed(3)}, not significant.
              </span>
            )}
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-[1.8] text-faint">
        Recorded flow: Binance USD-M perpetuals (bookTicker and aggTrades from data.binance.vision, CC BY-NC-SA 4.0), a calm, a median and a volatile week of
        2023–24; each week trains on days 1–4, validates on day 5 and tests on days 6–7. The agent (DRL4MM v2) averages five SAC actor networks, one per
        seed, each trained on BTC, ETH and LTC only with a reward that credits every fill with its 30 s markout; once a second it sets a half-spread and a
        skew around the microprice from order-flow, volatility and inventory features. The baseline is whichever did best on this instrument&apos;s
        validation days among a tuned fixed half-spread, Avellaneda-Stoikov, the repo&apos;s fixed-midpoint quotes and the previous TD3. Both quote about
        1,000 USDT per side on the identical replay, in a TypeScript port of the Python queue-position simulator that reproduces it fill for fill: 100 ms
        latency, our orders join the back of the queue, the market does not react to us, inventory is capped at five quotes and flattened across the
        spread at the end. Under these fill rules quoting at the touch loses money for everyone, so both mostly wait several bps away for spikes. No
        fees; not evidence of live performance.
      </p>
    </div>
  );
}
