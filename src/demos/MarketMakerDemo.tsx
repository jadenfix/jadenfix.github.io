import { useEffect, useMemo, useRef, useState } from 'react';
import { Ladder, PriceChart, Trace } from './mm/charts';
import { POLICY_LABEL } from './mm/theme';
import { Recorder, WINDOW } from './mm/recorder';
import { prepareActor, type ActorFile } from './mm/actor';
import { decodeSlice, LOT, type PolicyName, type SliceFile } from './mm/twin';
import type { MarketEvent } from './mm/env';
import { useOnScreen, useReducedMotion } from './orbit/hooks';

const STEP_MS = 260;
const DATA = `${import.meta.env.BASE_URL}data/mm/`;

const BTN = 'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

const signed = (v: number, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;

interface Loaded {
  actor: ActorFile;
  file: SliceFile;
  slices: MarketEvent[][];
}

let cache: Promise<Loaded> | null = null;
function loadData(): Promise<Loaded> {
  cache ??= Promise.all([
    fetch(`${DATA}td3-actor.json`).then((r) => r.json() as Promise<ActorFile>),
    fetch(`${DATA}ltc-slices.json`).then((r) => r.json() as Promise<SliceFile>),
  ]).then(([actor, file]) => ({ actor: prepareActor(actor), file, slices: file.slices.map((s) => decodeSlice(s.rows)) }));
  return cache;
}

function fresh(d: Loaded, k: number) {
  const r = new Recorder(d.slices[k], d.actor, d.file.quote_bps);
  r.advance(WINDOW);
  return r;
}

interface EvalRow {
  pnl_usdt_mean: number;
  pnl_usdt_total: number;
  sharpe_pnl: number;
  mean_abs_inv_lots: number;
  fills_mean: number;
}

export default function MarketMakerDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef, '300px');
  const reduce = useReducedMotion();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [slice, setSlice] = useState(0);
  const [rec, setRec] = useState<Recorder | null>(null);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<PolicyName>('td3');
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const running = playing && visible && rec !== null;

  useEffect(() => {
    if (!seen || data) return;
    let live = true;
    loadData().then(
      (d) => {
        if (!live) return;
        setData(d);
        setRec(fresh(d, 0));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [seen, data]);

  useEffect(() => {
    if (!running || !rec || !data) return;
    const id = window.setInterval(() => {
      if (rec.done) {
        // slice finished: move on to the next recorded slice
        const next = (slice + 1) % data.slices.length;
        setSlice(next);
        setRec(fresh(data, next));
        return;
      }
      rec.advance(1);
      setTick((t) => t + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [running, rec, data, slice]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const frame = useMemo(() => rec?.frame(view) ?? null, [rec, view, tick]);

  const other: PolicyName = view === 'fixed' ? 'td3' : 'fixed';
  const s = frame?.stats[view];
  const last = frame?.history[frame.history.length - 1]?.[view];
  const bps = data?.file.quote_bps ?? 0;
  const ev = data?.file.eval as { episodes: number; td3: EvalRow; fixed: EvalRow } | undefined;

  const readouts: [string, string, string, boolean][] = frame && s
    ? [
        ['inventory ltc', signed(s.inv, 1), `${POLICY_LABEL[other]}: ${signed(frame.stats[other].inv, 1)}`, true],
        ['pnl usdt', signed(s.pnl, 2), `${POLICY_LABEL[other]}: ${signed(frame.stats[other].pnl, 2)}`, false],
        ['agent fills', String(s.fills), `quote size ${(10 * LOT).toFixed(0)} ltc per side`, false],
        ['quotes', last?.bid != null && last?.ask != null ? `${last.bid.toFixed(2)} / ${last.ask.toFixed(2)}` : '–', `mid ${frame.mid?.toFixed(3) ?? '–'}`, false],
      ]
    : [
        ['inventory ltc', '–', '', true],
        ['pnl usdt', '–', '', false],
        ['agent fills', '–', '', false],
        ['quotes', '–', '', false],
      ];

  const nextSlice = () => {
    if (!data) return;
    const next = (slice + 1) % data.slices.length;
    setSlice(next);
    setRec(fresh(data, next));
    setTick(0);
  };
  const stepOnce = () => {
    if (!rec) return;
    rec.advance(1);
    setTick((t) => t + 1);
  };
  const startUtc = data?.file.slices[slice]?.start_utc;
  const usd = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[12px]">
        <div className="flex gap-4" role="group" aria-label="Quoting policy">
          {(['td3', 'fixed'] as const).map((p) => (
            <button key={p} type="button" aria-pressed={view === p} onClick={() => setView(p)} className={`${BTN} ${view === p ? 'text-phos' : 'text-dim hover:text-bone'}`}>
              [ {POLICY_LABEL[p]} ]
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button type="button" aria-pressed={!playing} onClick={() => setUserPlaying(!playing)} className={`${BTN} text-dim hover:text-bone`}>
            [ {playing ? 'pause' : 'play'} ]
          </button>
          <button type="button" onClick={stepOnce} disabled={playing || !rec} className={`${BTN} ${playing || !rec ? 'text-faint' : 'text-dim hover:text-bone'}`}>
            [ step ]
          </button>
          <button type="button" onClick={nextSlice} disabled={!data} className={`${BTN} text-dim hover:text-bone`}>
            [ next slice ]
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] border border-line bg-void md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="relative h-[284px] border-b border-line px-3 py-3 md:border-b-0 md:border-r">
          <div className="pointer-events-none absolute left-3 top-2 text-[10px] lowercase tracking-[0.14em] text-faint">ltcusdt fifo book · tick 0.01</div>
          <div className="h-full pt-3">
            {frame ? (
              <Ladder rows={frame.ladder} hot={frame.hot} mid={frame.mid} spread={frame.spread} rowH={17} />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-faint">{failed ? 'replay data unavailable' : 'loading recorded flow…'}</div>
            )}
          </div>
        </div>
        <div className="relative h-[170px] px-3 pb-2 pt-6 md:h-[284px]">
          <div className="pointer-events-none absolute left-3 top-2 flex gap-3 text-[10px] lowercase tracking-[0.14em] text-faint">
            <span>last {WINDOW} events</span>
            <span className="hidden sm:inline">
              <span className="text-phos">●</span> bought <span className="text-phos">○</span> sold
            </span>
            {startUtc && <span className="hidden lg:inline">slice from {startUtc.toLowerCase()}</span>}
          </div>
          <div className="h-full">{frame && <PriceChart history={frame.history} view={view} />}</div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-x border-b border-line md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        <div className="h-[96px] border-r border-line px-3 py-2 md:h-[112px]">
          {frame && <Trace history={frame.history} view={view} field="inv" label="inventory" fmt={(v) => signed(v, 1)} />}
        </div>
        <div className="h-[96px] px-3 py-2 md:h-[112px] md:border-r md:border-line">
          {frame && <Trace history={frame.history} view={view} field="pnl" label="pnl" fmt={(v) => signed(v, 2)} />}
        </div>
        <div className="hidden h-[112px] overflow-hidden px-3 py-2 text-[10.5px] md:block" aria-label="Recent trades">
          <div className="mb-1 text-[10px] lowercase tracking-[0.14em] text-dim">tape</div>
          {frame?.prints.map((p) => (
            <div key={p.key} className={`flex justify-between tabular-nums leading-[1.45] ${p.agent ? 'text-phos' : 'text-faint'}`}>
              <span>{p.agent ? `agent ${p.agent}` : `${p.aggressor} sweeps`}</span>
              <span>
                {p.qty.toFixed(1)} @ {p.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 border-x border-b border-line sm:grid-cols-4">
        {readouts.map(([k, v, sub, accent], i) => (
          <div key={k} className={`px-3 py-3 sm:px-4 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}>
            <dt className="text-[10px] lowercase tracking-[0.14em] text-dim">{k}</dt>
            <dd className={`mt-1 font-serif text-[24px] leading-none tabular-nums ${accent ? 'text-phos' : 'text-bone'}`}>{v}</dd>
            <dd className="mt-1 truncate text-[10px] text-faint">{sub || ' '}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        Recorded flow: Binance LTCUSDT perpetual on 2024-03-30 (bookTicker and aggTrades from data.binance.vision, CC BY-NC-SA 4.0), turned into the
        repo&apos;s add/market/cancel rows; only the top of book is recorded, so deeper levels are ones the touch has visited. The book and accounting are
        a TypeScript port of lob_simulator.py and market_env.py. &lsquo;td3 · trained&rsquo; is the repo&apos;s own TD3 agent and training loop, run for 400k
        steps on 00:00 to 16:00 UTC with the repo&apos;s reward (PnL change minus an inventory penalty); its actor network runs here, in the browser, on the
        same 52 features the Python env builds, and reproduces the Python episodes fill for fill. &lsquo;fixed midpoint&rsquo; is the repo&apos;s
        fixed-midpoint-quotes policy at {bps} bps, the setting that did best on the validation hours. Both replay the identical held-out stream.
        {ev && (
          <>
            {' '}
            Over {ev.episodes} held-out slices (19:00 to 24:00 UTC) td3 averaged {usd(ev.td3.pnl_usdt_mean)} USDT per slice against {usd(ev.fixed.pnl_usdt_mean)}{' '}
            for fixed midpoint (Sharpe-like {ev.td3.sharpe_pnl.toFixed(2)} vs {ev.fixed.sharpe_pnl.toFixed(2)}, mean |inventory| {(ev.td3.mean_abs_inv_lots * LOT).toFixed(1)} vs{' '}
            {(ev.fixed.mean_abs_inv_lots * LOT).toFixed(1)} LTC), so {ev.td3.pnl_usdt_mean > ev.fixed.pnl_usdt_mean ? 'the trained policy comes out ahead' : 'the trained policy does not beat the tuned fixed quotes yet'}. No
            fees, latency or exchange; not evidence of live performance.
          </>
        )}
      </p>
    </div>
  );
}
