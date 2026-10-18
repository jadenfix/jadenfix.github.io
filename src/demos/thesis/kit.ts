// Shared helpers for the thesis paper-page figures. Data come from public/data/thesis/*.json,
// exported from the rebuilt thesis outputs; nothing is estimated in the browser.

import { useEffect, useState } from 'react';

export { C, MINUS, signed } from '../regime/theme';
export { easeInOut, usePrefersReducedMotion, useReveal, useSize, useTween, useVisibility } from '../regime/hooks';
export { linear } from '../regime/scales';

type Loaded<T> = { data: T | null; failed: boolean };

const cache = new Map<string, Promise<unknown>>();

/** Fetch a JSON file once per page and share it between figures. */
export function useJson<T>(url: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ data: null, failed: false });
  useEffect(() => {
    let alive = true;
    let p = cache.get(url);
    if (!p) {
      p = fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      });
      cache.set(url, p);
      p.catch(() => cache.delete(url));
    }
    p.then((d) => alive && setState({ data: d as T, failed: false })).catch(() => alive && setState({ data: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

/** Bracketed toggle styling shared by every control: `[ label ]`. */
export function toggleClass(active: boolean): string {
  return `border px-2 py-[3px] text-[11px] lowercase tracking-[0.04em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phos disabled:opacity-40 ${
    active ? 'border-phos/70 text-phos' : 'border-line text-dim hover:border-faint hover:text-bone'
  }`;
}

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Clamp to [lo, hi]. */
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Evenly spaced "nice" ticks covering [lo, hi]. */
export function niceTicks(lo: number, hi: number, approx = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / approx;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= approx + 0.5) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

/** Month string 'YYYY-MM' as a fractional year at the start of that month. */
export function yearOf(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 1) / 12;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** 'YYYY-MM' as 'mon yyyy'. */
export function monthName(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
