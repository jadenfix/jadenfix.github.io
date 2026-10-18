// Types and helpers for public/data/regimes.json (exported from the rebuilt thesis outputs).

export type Episode = { peak: string; trough: string; confirmed: string; months: number; decline: number };

export type Skill = {
  h: number;
  best: string;
  bestLabel: string;
  bestBss: number;
  persistBss: number;
  bestBrier: number;
  persistBrier: number;
  uncondBrier: number;
  pVsPersist: number;
  n: number;
};

export type RegimeData = {
  start: string;
  n: number;
  price: number[];
  dd: number[];
  bear: string;
  bearNow: string;
  episodes: Episode[];
  regime: { start: string; filtered: number[]; smoothed: number[] };
  forecast: { start: string; end: string; horizon: number; model: string; label: string; p: number[]; persist: number[] };
  skill: Skill[];
  summary: { nChallengers: number; nBeatPersist5: number; minPPersist: number };
};

/** Episode with month indices resolved against the series start. */
export type Span = Episode & { i0: number; i1: number; iPeak: number; iConfirmed: number };

export type Prepared = RegimeData & {
  spans: Span[];
  regOff: number;
  fcOff: number;
  logPrice: number[];
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function ym(s: string): number {
  const [y, m] = s.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function monthIndex(start: string, s: string): number {
  return ym(s) - ym(start);
}

export function monthLabel(start: string, i: number): string {
  const t = ym(start) + i;
  return `${MONTHS[t % 12]} ${Math.floor(t / 12)}`;
}

export function yearAt(start: string, i: number): number {
  return (ym(start) + i) / 12;
}

/** Month index (fractional) of January of a given year. */
export function indexOfYear(start: string, year: number): number {
  return year * 12 - ym(start);
}

export function prepare(d: RegimeData): Prepared {
  const spans = d.episodes.map((e) => {
    const iPeak = monthIndex(d.start, e.peak);
    return {
      ...e,
      iPeak,
      i0: iPeak + 1, // dated from the month after the peak
      i1: monthIndex(d.start, e.trough),
      iConfirmed: monthIndex(d.start, e.confirmed),
    };
  });
  return {
    ...d,
    spans,
    regOff: monthIndex(d.start, d.regime.start),
    fcOff: monthIndex(d.start, d.forecast.start),
    logPrice: d.price.map((p) => Math.log10(p)),
  };
}

let cache: Promise<Prepared> | null = null;

export function loadRegimes(): Promise<Prepared> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/regimes.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`regimes.json ${r.status}`);
        return r.json() as Promise<RegimeData>;
      })
      .then(prepare)
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}
