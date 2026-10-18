import type { Prepared, Skill } from './data';
import { signed } from './theme';

const SCALE = 25; // percent at full bar width
const GRID = [0, 10, 20];

/**
 * Out-of-sample Brier skill (percent reduction in Brier score vs the unconditional bear
 * frequency) for the most accurate model at each horizon and for persistence.
 * Values come straight from bear_oos_metrics.csv via regimes.json.
 */
export default function SkillReadout({ data, shown }: { data: Prepared | null; shown: boolean }) {
  const rows: { h: number; full: Skill | null }[] = data
    ? data.skill.map((s) => ({ h: s.h, full: s }))
    : [1, 3, 6, 12].map((h) => ({ h, full: null }));
  const period = data ? `${data.forecast.start.slice(0, 4)} to ${data.forecast.end.slice(0, 4)}` : '';
  return (
    <div className="grid gap-8 border-t border-line pt-6 md:grid-cols-12">
      <div className="md:col-span-7">
        <div className="label">out of sample{period && `, ${period}`} · brier skill vs base rate</div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-dim">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-[5px] w-4 bg-phos" />
            best model at that horizon
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-[5px] w-4 bg-ice/60" />
            persistence (current real-time state)
          </span>
        </div>

        <dl className="mt-5 space-y-4">
          {rows.map(({ h, full }, i) => {
            return (
              <div key={h} className="grid grid-cols-[3rem_1fr_3.25rem] items-center gap-x-3 gap-y-[5px]">
                <dt className="row-span-3 self-start pt-[1px] text-[11px] text-bone">{h} mo</dt>
                <Bar value={full?.bestBss ?? 0} tone="bg-phos" shown={shown && !!full} delay={i * 140} />
                <dd className="text-right text-[11px] tabular-nums text-phos">{full ? `${signed(full.bestBss)}%` : ''}</dd>
                <Bar value={full?.persistBss ?? 0} tone="bg-ice/60" shown={shown && !!full} delay={i * 140 + 70} />
                <dd className="text-right text-[11px] tabular-nums text-ice/80">{full ? `${signed(full.persistBss)}%` : ''}</dd>
                <dd className="col-span-2 text-[10.5px] leading-[1.4] text-faint">
                  {full ? (
                    <>
                      {full.bestLabel.toLowerCase()} <span className="text-faint/70">·</span> p = {full.pVsPersist.toFixed(2)} vs persistence
                    </>
                  ) : (
                    ' '
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="mt-2 grid grid-cols-[3rem_1fr_3.25rem] gap-x-3" aria-hidden>
          <span />
          <div className="relative h-3 text-[9.5px] text-faint">
            {GRID.map((g) => (
              <span key={g} className="absolute -translate-x-1/2" style={{ left: `${(g / SCALE) * 100}%` }}>
                {g}%
              </span>
            ))}
          </div>
          <span />
        </div>
      </div>

      <div className="flex flex-col gap-6 md:col-span-5 md:pt-1">
        <figure>
          <blockquote className="font-serif text-[22px] leading-[1.25] text-bone sm:text-[25px]">
            In real time, the information that best predicts a bear market next month is that one has already begun.
          </blockquote>
          <figcaption className="mt-3 label">from the revised thesis, conclusion</figcaption>
        </figure>
        <p className="text-[12px] leading-relaxed text-dim">
          {data ? (
            <>
              Models beat the unconditional rate at short horizons, but none of the {data.summary.nChallengers} model and
              horizon pairs beats persistence at the 5% level (smallest p = {data.summary.minPPersist.toFixed(3)}). By twelve
              months the best skill is {signed(data.skill[data.skill.length - 1].bestBss)}%, not reliably better than the base
              rate. Every forecast uses only data available at its origin month.
            </>
          ) : (
            ' '
          )}
        </p>
      </div>
    </div>
  );
}

function Bar({ value, tone, shown, delay }: { value: number; tone: string; shown: boolean; delay: number }) {
  const pct = Math.max(0, Math.min(1, value / SCALE)) * 100;
  return (
    <div className="relative h-[5px]">
      {GRID.map((g) => (
        <span key={g} aria-hidden className="absolute -top-[3px] h-[11px] w-px bg-line" style={{ left: `${(g / SCALE) * 100}%` }} />
      ))}
      <div
        className={`absolute inset-y-0 left-0 origin-left ${tone}`}
        style={{
          width: `${pct}%`,
          transform: shown ? 'scaleX(1)' : 'scaleX(0)',
          transition: `transform 1100ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`,
        }}
      />
    </div>
  );
}
