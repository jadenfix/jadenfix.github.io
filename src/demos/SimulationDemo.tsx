// simulation-theory, live: two instruments built on the repo's real-data checks (branch `sharpen`).
//   [ evidence ]  is a stream simulated? KT Bayes factor on NIST beacon bits vs a simulated source (ST-T01, ST-T185, ST-M50, ST-F34)
//   [ bell test ] replay of the Delft 2015 loophole-free Bell trials vs a local hidden-variable model (ST-F32, ST-F33, ST-T12)
// Fixed height: 600px at every width.
import { useEffect, useRef, useState } from 'react';
import { useOnScreen, useReducedMotion } from './orbit/hooks';
import BellPanel from './simulation/BellPanel';
import { loadBeacon, loadDelft, verifyBeacon, type Beacon, type Delft } from './simulation/data';
import EvidencePanel from './simulation/EvidencePanel';
import { BTN, type PanelApi } from './simulation/theme';

type Tab = 'evidence' | 'bell';
const TABS: [Tab, string][] = [
  ['evidence', 'evidence'],
  ['bell', 'bell test'],
];

export default function SimulationDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { visible, seen } = useOnScreen(wrapRef, '200px');
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>('evidence');
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduce;
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [delft, setDelft] = useState<Delft | null>(null);
  const [verified, setVerified] = useState<[number, number] | null>(null);
  const [failed, setFailed] = useState(false);
  const api = useRef<PanelApi | null>(null);

  useEffect(() => {
    if (!seen) return;
    let live = true;
    Promise.all([loadBeacon(), loadDelft()]).then(
      ([b, d]) => {
        if (!live) return;
        setBeacon(b);
        setDelft(d);
        verifyBeacon(b).then((v) => live && setVerified(v), () => {});
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [seen]);

  const ready = tab === 'evidence' ? beacon !== null : delft !== null;

  return (
    <div
      ref={wrapRef}
      className="flex h-[600px] flex-col font-mono text-bone"
      style={{ opacity: seen ? 1 : 0, transition: reduce ? undefined : 'opacity 1s ease' }}
    >
      <div className="flex h-7 items-center justify-between gap-3 text-[12px]">
        <div className="flex gap-3 sm:gap-4" role="group" aria-label="Instrument">
          {TABS.map(([t, label]) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`${BTN} ${tab === t ? 'text-phos' : 'text-dim hover:text-bone'}`}>
              [ {label} ]
            </button>
          ))}
        </div>
        <div className="flex gap-3 sm:gap-4">
          <button type="button" aria-pressed={!playing} onClick={() => setUserPlaying(!playing)} className={`${BTN} text-dim hover:text-bone`}>
            [ {playing ? 'pause' : 'play'} ]
          </button>
          <button
            type="button"
            onClick={() => api.current?.step()}
            disabled={playing || !ready}
            className={`${BTN} hidden sm:inline ${playing || !ready ? 'text-faint' : 'text-dim hover:text-bone'}`}
          >
            [ step ]
          </button>
          <button type="button" onClick={() => api.current?.reset()} disabled={!ready} className={`${BTN} hidden sm:inline text-dim hover:text-bone`}>
            [ reset ]
          </button>
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1">
        {tab === 'evidence' && beacon && (
          <EvidencePanel key="evidence" beacon={beacon} verified={verified} playing={playing} visible={visible} reduce={reduce} api={api} />
        )}
        {tab === 'bell' && delft && <BellPanel key="bell" delft={delft} playing={playing} visible={visible} reduce={reduce} api={api} />}
        {!ready && (
          <div className="flex h-[372px] items-center justify-center border border-line text-[11px] text-faint">
            {failed ? 'real-data files unavailable' : 'loading real data…'}
          </div>
        )}
      </div>
    </div>
  );
}
