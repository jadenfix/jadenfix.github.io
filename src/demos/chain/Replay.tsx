import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { countBy, isDown, type Block, type Session } from './data';

const RED = '#ec5c52';
const GREEN = '#8fb59a';
const PHOS = 'rgb(var(--c-phos))';
const BONE = 'rgb(var(--c-bone))';
const DIM = 'rgb(var(--c-dim))';
const FAINT = 'rgb(var(--c-faint))';
const LINE = 'rgb(var(--c-line))';
const BTN =
  'whitespace-nowrap py-1 text-left transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

const MAX_TXS = 476; // block gas limit / 21k gas per transfer
const BIN_MS = 2000; // throughput track bin
const TRACK_H = 38; // throughput track height, px

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(240, el.clientWidth));
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const fmtS = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function Replay({ session, visible, reduce }: { session: Session; visible: boolean; reduce: boolean }) {
  const [lo, hi] = session.window;
  const down = session.down[0];
  // start a little before the kill under reduced motion (a static, informative frame)
  const [t, setT] = useState(() => (reduce && down ? down.from + 6000 : lo + 4000));
  const [playing, setPlaying] = useState(!reduce);
  const [speed, setSpeed] = useState(1);
  const { ref: laneRef, w } = useWidth<HTMLDivElement>();

  // slot -> time: the median offset between a proposal's time and its slot number
  const slotZero = useMemo(() => {
    const offs = session.blocks
      .filter((b) => b.proposedAt != null)
      .map((b) => (b.proposedAt as number) - b.slot * session.slotMs)
      .sort((a, b) => a - b);
    return offs.length ? offs[Math.floor(offs.length / 2)] : 0;
  }, [session]);
  const slotT = (slot: number) => slotZero + slot * session.slotMs;

  const byHash = useMemo(() => new Map(session.blocks.map((b) => [b.hash, b])), [session]);

  // calm real-time playback, paused offscreen
  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(1000, now - last); // keep real time even if frames are throttled
      last = now;
      setT((x) => {
        const n = x + dt * speed;
        return n > hi ? lo : n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, speed, lo, hi]);

  const narrow = w < 480;
  const LANE_H = narrow ? 146 : 200; // chain lane height, px
  const MAIN_Y = narrow ? 30 : 46; // canonical lane
  const FORK_Y = narrow ? 86 : 120; // blocks that lost to a sibling
  const span = narrow ? 7000 : 11000; // ms of history in the lane
  const right = t + 900;
  const left = right - span;
  const x = (ms: number) => ((ms - left) / span) * w;
  const bw = Math.max(9, Math.min(26, (session.slotMs / span) * w * 0.72));

  const shown = session.blocks.filter((b) => b.seen != null && (b.seen as number) <= t && slotT(b.slot) > left - 1000);
  const forkLane = (b: Block) => b.prunedAt != null;

  const finalizedUpTo = session.blocks.filter((b) => b.finalAt != null && b.finalAt <= t);
  const lastFinal = finalizedUpTo.reduce<Block | null>((best, b) => (!best || b.slot > best.slot ? b : best), null);
  const recentTxs = finalizedUpTo.filter((b) => (b.finalAt as number) > t - 5000).reduce((s, b) => s + b.txs, 0);
  const up = session.validators.filter((v) => !isDown(session, v.id, t)).length;

  // the most recent thing that happened, as one line
  const line = useMemo(() => {
    type E = { at: number; text: string; tone: string };
    const evs: E[] = [];
    for (const d of session.down) {
      evs.push({ at: d.from, text: `validator ${d.validator} killed: 3 of 4 keep finalizing (quorum is 3)`, tone: RED });
      evs.push({ at: d.to, text: `validator ${d.validator} restarted: it requests the blocks it missed and catches up`, tone: GREEN });
    }
    for (const b of session.blocks) {
      if (b.proposedAt != null) evs.push({ at: b.proposedAt, text: `slot ${b.slot}: v${b.proposer} proposes ${b.txs} tx`, tone: DIM });
      if (b.qcAt != null)
        evs.push({ at: b.qcAt, text: `slot ${b.slot}: ${b.qcSigners?.length ?? 3} of 4 BLS votes aggregate into a quorum certificate`, tone: PHOS });
      if (b.finalAt != null && b.proposedAt != null)
        evs.push({ at: b.finalAt, text: `slot ${b.slot} final after ${fmtS(b.finalAt - b.proposedAt)} (its child in the next slot was certified)`, tone: BONE });
      if (b.prunedAt != null) evs.push({ at: b.prunedAt, text: `slot ${b.slot}: competing block dropped, a sibling won finality`, tone: RED });
    }
    return evs.sort((a, b) => a.at - b.at);
  }, [session]);
  let current = line[0];
  for (const e of line) {
    if (e.at <= t) current = e;
    else break;
  }

  // whole-recording track: finalized transactions per second
  const buckets = useMemo(() => {
    const n = Math.ceil((hi - lo) / BIN_MS);
    const arr = new Array<number>(n).fill(0);
    for (const b of session.blocks) {
      if (b.finalAt == null) continue;
      const i = Math.floor((b.finalAt - lo) / BIN_MS);
      if (i >= 0 && i < n) arr[i] += b.txs / (BIN_MS / 1000);
    }
    return arr.map(Math.round);
  }, [session, lo, hi]);
  const peak = Math.max(1, ...buckets);

  const seek = (ms: number) => setT(Math.max(lo, Math.min(hi, ms)));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      setPlaying((p) => !p);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seek(t + 2000);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(t - 2000);
    }
  };

  return (
    <div className="flex h-full flex-col" onKeyDown={onKey}>
      {/* validators */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="validators">
        {session.validators.map((v) => {
          const dn = isDown(session, v.id, t);
          const proposing = session.blocks.some((b) => b.proposer === v.id && b.proposedAt != null && t - b.proposedAt >= 0 && t - b.proposedAt < 450);
          const voted = session.blocks.some((b) => {
            const vt = b.votes[String(v.id)];
            return vt != null && t - vt >= 0 && t - vt < 300;
          });
          return (
            <div
              key={v.id}
              className="border px-2 py-1.5 transition-colors duration-short"
              style={{ borderColor: dn ? RED : proposing ? PHOS : LINE, borderStyle: dn ? 'dashed' : 'solid' }}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[12px] text-bone">v{v.id}</span>
                <span className="text-[10px]" style={{ color: dn ? RED : GREEN }}>
                  {dn ? 'down' : 'up'}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-faint">
                <span className="truncate">{v.short}</span>
                <span
                  aria-hidden
                  className="inline-block h-[6px] w-[6px] rounded-full transition-opacity duration-micro"
                  style={{ background: PHOS, opacity: voted && !dn ? 1 : 0.12 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* chain lane */}
      <div
        ref={laneRef}
        tabIndex={0}
        aria-label="chain replay: space plays or pauses, left and right arrows seek 2 seconds"
        className="relative mt-3 border border-line bg-void outline-none focus-visible:border-phos"
        style={{ height: LANE_H }}
      >
        <svg width={w} height={LANE_H - 2} className="block" role="img" aria-label={`blocks around ${fmtS(t)}; ${finalizedUpTo.length} finalized so far`}>
          {/* slot grid */}
          {Array.from({ length: Math.ceil(span / session.slotMs) + 2 }, (_, i) => {
            const slot = Math.floor((left - slotZero) / session.slotMs) + i;
            const sx = x(slotT(slot));
            return sx < 0 || sx > w ? null : (
              <line key={slot} x1={sx} x2={sx} y1={10} y2={LANE_H - 4} stroke={LINE} strokeWidth={1} opacity={slot % 10 === 0 ? 1 : 0.45} />
            );
          })}
          {/* down interval */}
          {session.down.map((d) => {
            const x0 = Math.max(0, x(d.from));
            const x1 = Math.min(w, x(Math.min(d.to, t)));
            return d.from <= t && x1 > x0 ? <rect key={d.from} x={x0} y={4} width={x1 - x0} height={3} fill={RED} opacity={0.6} /> : null;
          })}
          {/* parent links */}
          {shown.map((b) => {
            const p = byHash.get(b.parent);
            if (!p || p.seen == null || (p.seen as number) > t) return null;
            const y1 = forkLane(b) ? FORK_Y : MAIN_Y;
            const y0 = forkLane(p) ? FORK_Y : MAIN_Y;
            const x1 = x(slotT(b.slot)) - bw / 2;
            const x0 = x(slotT(p.slot)) + bw / 2;
            const dead = b.prunedAt != null && b.prunedAt <= t;
            return (
              <path
                key={`e${b.hash}`}
                d={`M${x0},${y0 + 16} C${(x0 + x1) / 2},${y0 + 16} ${(x0 + x1) / 2},${y1 + 16} ${x1},${y1 + 16}`}
                fill="none"
                stroke={dead ? RED : FAINT}
                strokeWidth={1}
                opacity={dead ? 0.35 : 0.8}
              />
            );
          })}
          {/* blocks */}
          {shown.map((b) => {
            const cx = x(slotT(b.slot));
            const y = forkLane(b) ? FORK_Y : MAIN_Y;
            const certified = b.qcAt != null && b.qcAt <= t;
            const final = b.finalAt != null && b.finalAt <= t;
            const dead = b.prunedAt != null && b.prunedAt <= t;
            const fillH = Math.max(1, Math.round((b.txs / MAX_TXS) * 30));
            const stroke = dead ? RED : final ? BONE : certified ? PHOS : DIM;
            const votes = countBy(b.votes, t);
            return (
              <g key={b.hash} opacity={dead ? 0.4 : 1}>
                <rect x={cx - bw / 2} y={y} width={bw} height={32} fill={final ? 'rgb(var(--c-bone) / 0.08)' : 'none'} stroke={stroke} strokeWidth={1} />
                {b.txs > 0 ? <rect x={cx - bw / 2 + 2} y={y + 32 - fillH - 1} width={bw - 4} height={fillH} fill={final ? BONE : certified ? PHOS : DIM} opacity={0.75} /> : null}
                {/* four vote ticks: lit as each validator's BLS vote arrives */}
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} x={cx - bw / 2 + (i * bw) / 4 + 1} y={y + 36} width={Math.max(1, bw / 4 - 2)} height={2} fill={i < votes ? PHOS : LINE} />
                ))}
                {w >= 420 || b.slot % 2 === 0 ? (
                  <text x={cx} y={y - 4} textAnchor="middle" fontSize={9} fill={FAINT} fontFamily="JetBrains Mono, monospace">
                    {b.slot}
                  </text>
                ) : null}
                <text x={cx} y={y + 50} textAnchor="middle" fontSize={8.5} fill={final ? DIM : FAINT} fontFamily="JetBrains Mono, monospace">
                  v{b.proposer}
                </text>
              </g>
            );
          })}
          {/* playhead */}
          <line x1={x(t)} x2={x(t)} y1={10} y2={LANE_H - 4} stroke={PHOS} strokeWidth={1} opacity={0.5} />
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[9.5px] text-faint">
        <span>
          <span style={{ color: DIM }}>□</span> proposed
        </span>
        <span>
          <span style={{ color: PHOS }}>□</span> certified (QC)
        </span>
        <span>
          <span style={{ color: BONE }}>■</span> final
        </span>
        <span>
          <span style={{ color: RED }}>□</span> dropped fork
        </span>
        <span className="hidden sm:inline">bar = txs · ticks = votes</span>
      </div>

      {/* stats */}
      <dl className="mt-3 grid grid-cols-2 border-y border-line text-[11px] sm:grid-cols-4">
        {(
          [
            ['finalized slot', lastFinal ? String(lastFinal.slot) : '..', BONE],
            ['last propose to final', lastFinal && lastFinal.proposedAt != null && lastFinal.finalAt != null ? fmtS(lastFinal.finalAt - lastFinal.proposedAt) : '..', PHOS],
            ['finalized tx/s (5 s)', String(Math.round(recentTxs / 5)), BONE],
            ['validators up', `${up} / 4`, up < 4 ? RED : GREEN],
          ] as const
        ).map(([k, v, c], i) => (
          <div key={k} className={`py-1 sm:py-2 ${i % 2 ? 'border-l border-line pl-3' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l sm:pl-3' : ''}`}>
            <dt className="label truncate">{k}</dt>
            <dd className="font-serif text-[19px] leading-tight tabular-nums sm:text-[22px]" style={{ color: c }}>
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {/* what just happened */}
      <p className="mt-2 h-[2.5em] shrink-0 overflow-hidden text-[11px] leading-[1.25em] sm:h-[1.25em] sm:truncate" style={{ color: current?.tone ?? DIM }} aria-live="off">
        <span className="text-faint">t = {fmtS(t)} · </span>
        {current?.text ?? 'waiting for the first block'}
      </p>

      {/* controls */}
      <div className="mt-auto pt-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px]" role="group" aria-label="replay controls">
          <button type="button" className={`${BTN} text-bone hover:text-phos`} onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            [ {playing ? 'pause' : 'play'} ]
          </button>
          <button type="button" className={`${BTN} text-dim hover:text-phos`} onClick={() => setSpeed((s) => (s === 1 ? 4 : 1))} aria-label={`playback speed ${speed}x`}>
            [ {speed}x ]
          </button>
          {down ? (
            <>
              <button
                type="button"
                className={`${BTN} hover:text-phos`}
                style={{ color: RED }}
                onClick={() => {
                  seek(down.from - 1500);
                  setPlaying(true);
                }}
              >
                [ kill validator {down.validator} ]
              </button>
              <button
                type="button"
                className={`${BTN} hover:text-phos`}
                style={{ color: GREEN }}
                onClick={() => {
                  seek(down.to - 1500);
                  setPlaying(true);
                }}
              >
                [ restart validator {down.validator} ]
              </button>
            </>
          ) : null}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="label truncate">finalized tx/s, whole run</span>
          <span className="text-[10px] text-faint">peak {peak}</span>
        </div>
        <svg width={w} height={TRACK_H} className="mt-1 block cursor-pointer" aria-hidden onClick={(e) => seek(lo + (e.nativeEvent.offsetX / w) * (hi - lo))}>
          {session.down.map((d) => (
            <g key={d.from}>
              <rect x={((d.from - lo) / (hi - lo)) * w} y={0} width={((d.to - d.from) / (hi - lo)) * w} height={TRACK_H} fill={RED} opacity={0.08} />
              <text x={((d.from - lo) / (hi - lo)) * w + 4} y={10} fontSize={9} fill={RED} fontFamily="JetBrains Mono, monospace">
                v{d.validator} down
              </text>
            </g>
          ))}
          {buckets.map((v, i) => {
            const bx = (i / buckets.length) * w;
            const bh = (v / peak) * (TRACK_H - 13);
            const past = lo + (i + 1) * BIN_MS <= t;
            return <rect key={i} x={bx + 0.5} y={TRACK_H - 1 - bh} width={Math.max(1, w / buckets.length - 1)} height={bh} fill={past ? BONE : FAINT} opacity={past ? 0.7 : 0.5} />;
          })}
          <line x1={((t - lo) / (hi - lo)) * w} x2={((t - lo) / (hi - lo)) * w} y1={0} y2={TRACK_H} stroke={PHOS} strokeWidth={1} />
        </svg>
        <label className="mt-1 flex items-center gap-3">
          <span className="label shrink-0">recording time</span>
          <input
            type="range"
            min={lo}
            max={hi}
            step={100}
            value={Math.round(t)}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-4 min-w-0 flex-1 accent-[#e8a96a]"
            aria-valuetext={fmtS(t)}
          />
        </label>
      </div>
    </div>
  );
}
