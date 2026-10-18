import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from './regime/Chart';
import { loadRegimes, monthIndex, monthLabel, type Prepared } from './regime/data';
import { usePrefersReducedMotion, useSize, useVisibility } from './regime/hooks';
import { clampWin } from './regime/scales';
import SkillReadout from './regime/SkillReadout';
import { signed, type Mode } from './regime/theme';

const PRESETS: { key: string; label: string; from: string; to: string }[] = [
  { key: '1929', label: '1929', from: '1927-01', to: '1935-12' },
  { key: '1973', label: '1973-74', from: '1971-01', to: '1976-12' },
  { key: '1987', label: '1987', from: '1985-07', to: '1989-06' },
  { key: '2000', label: '2000-02', from: '1998-01', to: '2004-12' },
  { key: '2008', label: '2008', from: '2006-01', to: '2010-12' },
];

const NOTES: Record<Mode, string> = {
  filtered:
    'Filtered: uses returns up to each month only, so it is what could have been known then. Only this one can feed a forecast.',
  smoothed:
    'Smoothed: also uses every later return. Cleaner in hindsight, but it sees the future, so it can never be used to forecast.',
};

export default function RegimeExplorer() {
  const [data, setData] = useState<Prepared | null>(null);
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<Mode>('filtered');
  const [win, setWin] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);
  const { visible } = useVisibility(boxRef, '0px 0px -8% 0px');
  const { seen } = useVisibility(skillRef, '0px 0px -8% 0px');
  const size = useSize(boxRef);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    let alive = true;
    loadRegimes()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const n = data?.n ?? 1;
  const full: [number, number] = useMemo(() => [-0.5, n - 0.5], [n]);
  const presets = useMemo(
    () =>
      data
        ? PRESETS.map((p) => ({ ...p, win: clampWin(monthIndex(data.start, p.from) - 0.5, monthIndex(data.start, p.to) + 0.5, data.n) }))
        : [],
    [data],
  );
  const activePreset = win ? presets.find((p) => p.win[0] === win[0] && p.win[1] === win[1])?.key ?? 'brush' : 'all';

  return (
    <section aria-labelledby="regime-title" className="w-full min-w-0 text-bone">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="label">
            <span className="text-phos">regime explorer</span>
            <span className="mx-2 text-faint">·</span>s&amp;p 500, 1900 to 2023
          </div>
          <h3 id="regime-title" className="mt-2 font-serif text-[26px] leading-tight text-bone sm:text-[30px]">
            Bear markets, in hindsight and in real time
          </h3>
        </div>
      </header>

      {/* controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Regime probability" className="flex flex-wrap gap-2">
          {(['filtered', 'smoothed'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`border px-2 py-[3px] text-[11px] lowercase tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos ${
                mode === m ? 'border-phos/70 text-phos' : 'border-line text-dim hover:border-faint hover:text-bone'
              }`}
            >
              <span aria-hidden className="text-faint">[ </span>
              {m === 'filtered' ? 'filtered · real time' : 'smoothed · hindsight'}
              <span aria-hidden className="text-faint"> ]</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Jump to period" className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="label mr-1">jump</span>
          <PresetButton active={activePreset === 'all'} disabled={!data} onClick={() => setWin(null)} label="all" />
          {presets.map((p) => (
            <PresetButton key={p.key} active={activePreset === p.key} disabled={!data} onClick={() => setWin(p.win)} label={p.label} />
          ))}
        </div>
      </div>
      <p className="mt-3 min-h-[3em] text-[11.5px] leading-[1.5] text-dim sm:min-h-[1.5em]" aria-live="polite">
        {NOTES[mode]}
      </p>

      <Readout data={data} hover={hover} mode={mode} />

      {/* chart: fixed height so nothing shifts when data arrives */}
      <div ref={boxRef} className="relative mt-3 h-[320px] w-full sm:h-[400px]">
        {data && (
          <Chart
            data={data}
            w={size.w}
            h={size.h}
            mode={mode}
            win={win ?? full}
            onWin={setWin}
            hover={hover}
            onHover={setHover}
            visible={visible}
            reduce={reduce}
          />
        )}
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center label">
            {failed ? 'data unavailable' : 'loading series'}
          </div>
        )}
      </div>

      <div ref={skillRef} className="mt-8">
        <SkillReadout data={data} shown={seen && !!data} />
      </div>

      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
        Data: Shiller monthly S&amp;P 500; revised edition of my Adam Smith Award thesis (in progress). Bear markets
        are dated on the real price: a 20% fall from a peak starts one, a 20% rise from the trough ends it. Regime
        probabilities come from a two-regime MS-AR(1) on real returns estimated on 1960 to 2023; the forecasts are refit
        every month on data available at the time.
      </p>
    </section>
  );
}

function PresetButton({ active, disabled, onClick, label }: { active: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`px-[6px] py-[3px] text-[11px] lowercase tabular-nums transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-phos disabled:opacity-40 ${
        active ? 'text-phos underline decoration-phos/60 underline-offset-[5px]' : 'text-dim hover:text-bone'
      }`}
    >
      {label}
    </button>
  );
}

function Readout({ data, hover, mode }: { data: Prepared | null; hover: number | null; mode: Mode }) {
  const i = data ? hover ?? data.n - 1 : null;
  const live = hover != null;

  let month = ' ';
  let price = ' ';
  let dd = ' ';
  let prob = ' ';
  let fc = ' ';
  let dated = ' ';
  let episode = ' ';
  let inBear = false;

  if (data && i != null) {
    month = monthLabel(data.start, i);
    price = Math.round(data.price[i]).toLocaleString('en-US');
    dd = data.dd[i] === 0 ? 'at high' : `${signed(data.dd[i])}%`;
    const ri = i - data.regOff;
    const series = data.regime[mode];
    prob = ri >= 0 && ri < series.length ? series[ri].toFixed(2) : 'n/a, pre-1960';
    const fi = i - data.fcOff;
    fc =
      fi >= 0 && fi < data.forecast.p.length
        ? `${data.forecast.p[fi].toFixed(2)} / ${data.forecast.persist[fi].toFixed(2)}`
        : 'n/a, pre-1960';
    inBear = data.bear[i] === '1';
    const now = data.bearNow[i] === '1';
    dated = `${inBear ? 'yes' : 'no'} / ${now ? (inBear ? 'yes' : 'still yes') : inBear ? 'not yet' : 'no'}`;
    const s = data.spans.find((sp) => i >= sp.i0 && i <= sp.i1);
    episode = s
      ? `peak ${monthLabel(data.start, s.iPeak)} · trough ${monthLabel(data.start, s.i1)} · ${signed(s.decline)}% real · confirmed ${monthLabel(data.start, s.iConfirmed)}`
      : live
        ? 'not in a dated bear market'
        : 'hover or touch the chart · drag to zoom · arrow keys step, esc resets';
  }

  const fields: [string, string, string][] = [
    ['month', month, live ? 'text-bone' : 'text-dim'],
    ['real price', price, 'text-bone'],
    ['below prior high', dd, 'text-bone'],
    [`p(bear) ${mode}`, prob, 'text-phos'],
    ['1-mo fcst / persist', fc, 'text-bone'],
    ['dated / real time', dated, inBear ? 'text-[#ec5c52]' : 'text-bone'],
  ];

  return (
    <div className="mt-4 border-y border-line py-3" aria-live="polite" aria-atomic="true">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map(([k, v, tone]) => (
          <div key={k} className="min-w-0">
            <dt className="truncate text-[10px] lowercase tracking-[0.12em] text-faint">{k}</dt>
            <dd className={`mt-[2px] truncate text-[12.5px] tabular-nums ${tone}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 h-[2.9em] overflow-hidden text-[11px] leading-[1.45] text-dim sm:h-[1.45em] sm:truncate">{episode}</div>
    </div>
  );
}
