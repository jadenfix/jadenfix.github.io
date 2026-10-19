import { useEffect, useRef, useState } from 'react';
import { useOnScreen, useReducedMotion } from './orbit/hooks';
import { Compare } from './chain/Compare';
import { loadBenchmarks, loadSession, type Benchmarks, type Session } from './chain/data';
import { Replay } from './chain/Replay';

/** fixed height of the framed demo, in px (the frame never resizes while it plays) */
export const CHAIN_DEMO_HEIGHT = 620;

type Tab = 'replay' | 'compare';
const BTN =
  'whitespace-nowrap py-1 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos';

export default function ChainDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef);
  const reduce = useReducedMotion();
  const [session, setSession] = useState<Session | null>(null);
  const [bench, setBench] = useState<Benchmarks | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('replay');

  useEffect(() => {
    let live = true;
    Promise.all([loadSession(), loadBenchmarks()]).then(
      ([s, b]) => {
        if (!live) return;
        setSession(s);
        setBench(b);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <div ref={wrapRef} className="font-mono text-bone" style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}>
      {/* a fixed frame from sm up (620px, CHAIN_DEMO_HEIGHT); on a phone the controls wrap, so it may grow */}
      <div className="flex flex-col overflow-hidden border border-line bg-panel p-3 sm:h-[620px] sm:p-4" style={{ minHeight: CHAIN_DEMO_HEIGHT }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap gap-x-3 text-[11.5px]" role="tablist" aria-label="view">
            {(['replay', 'compare'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`${BTN} ${tab === k ? 'text-phos' : 'text-dim hover:text-bone'}`}
              >
                [ {k === 'replay' ? 'recorded devnet' : 'vs bitcoin, solana'} ]
              </button>
            ))}
          </div>
          <span className="label truncate">4 validators · one m4 · localhost</span>
        </div>
        <div className="mt-3 min-h-0 flex-1">
          {failed ? (
            <div className="flex h-full items-center justify-center text-[11px] text-faint">could not load the recorded session</div>
          ) : !session || !bench ? (
            <div className="flex h-full items-center justify-center text-[11px] text-faint">loading the recorded session</div>
          ) : tab === 'replay' ? (
            <Replay session={session} visible={visible} reduce={reduce} />
          ) : (
            <Compare bench={bench} />
          )}
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-[11px] leading-[1.8] text-faint">
        A real session, replayed. Four aether-node processes ran a devnet on one Apple M4 over localhost while a load generator sent 100 transfers a second;
        validator 3 was killed 25 s in and restarted 30 s later. Every proposal, BLS vote, quorum certificate, finalization and dropped fork above is a timestamp
        a validator wrote to its event log during that run; the kill and restart buttons jump to those moments in the recording. A block is final when it and
        its child in the next slot both carry quorum certificates (3 of 4 validators). Numbers on the compare tab are measured the same way, and the public
        Bitcoin and Solana figures are dated and sourced.
      </p>
    </div>
  );
}
