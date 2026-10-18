// Small, dependency-free scale and path helpers.

export type Linear = (v: number) => number;

export function linear(d0: number, d1: number, r0: number, r1: number): Linear {
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v) => r0 + (v - d0) * k;
}

/** Log10 extent of `logs` over the index window [a, b], padded. */
export function logExtent(logs: number[], a: number, b: number, pad = 0.06): [number, number] {
  const i0 = Math.max(0, Math.floor(a));
  const i1 = Math.min(logs.length - 1, Math.ceil(b));
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = i0; i <= i1; i++) {
    if (logs[i] < lo) lo = logs[i];
    if (logs[i] > hi) hi = logs[i];
  }
  const span = Math.max(hi - lo, 0.08);
  return [lo - span * pad, hi + span * pad];
}

const LEVELS = [[1], [1, 2, 5], [1, 1.5, 2, 3, 5, 7], [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]];

/** Price ticks on a log axis: the sparsest "nice" set giving at least `min` ticks. */
export function logTicks(lo: number, hi: number, min = 3, max = 6): number[] {
  const e0 = Math.floor(lo) - 1;
  const e1 = Math.ceil(hi) + 1;
  let best: number[] = [];
  for (const level of LEVELS) {
    const ticks: number[] = [];
    for (let e = e0; e <= e1; e++) {
      for (const m of level) {
        const v = m * Math.pow(10, e);
        const l = Math.log10(v);
        if (l >= lo && l <= hi) ticks.push(v);
      }
    }
    best = ticks;
    if (ticks.length >= min) break;
  }
  if (best.length > max) {
    const step = Math.ceil(best.length / max);
    best = best.filter((_, i) => i % step === 0);
  }
  return best;
}

const YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50];

/** Calendar-year ticks for a time window, roughly one per `px` pixels. */
export function yearTicks(y0: number, y1: number, width: number, px = 52): number[] {
  const want = Math.max(2, Math.floor(width / px));
  const span = y1 - y0;
  const step = YEAR_STEPS.find((s) => span / s <= want) ?? 50;
  const out: number[] = [];
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) out.push(y);
  return out;
}

/** Polyline through (x(i), y(v[i])) for i in [a, b], skipping null-ish values. */
export function linePath(
  values: ArrayLike<number>,
  offset: number,
  a: number,
  b: number,
  x: Linear,
  y: Linear,
  step = false,
): string {
  const i0 = Math.max(offset, Math.floor(a) - 1);
  const i1 = Math.min(offset + values.length - 1, Math.ceil(b) + 1);
  let d = '';
  for (let i = i0; i <= i1; i++) {
    const px = x(i).toFixed(1);
    const py = y(values[i - offset]).toFixed(1);
    if (!d) d = `M${px},${py}`;
    else if (step) d += `H${px}V${py}`;
    else d += `L${px},${py}`;
  }
  return d;
}

/** Closed area under a series down to `base` (pixel y). */
export function areaPath(
  values: ArrayLike<number>,
  offset: number,
  a: number,
  b: number,
  x: Linear,
  y: Linear,
  base: number,
): string {
  const line = linePath(values, offset, a, b, x, y);
  if (!line) return '';
  const i0 = Math.max(offset, Math.floor(a) - 1);
  const i1 = Math.min(offset + values.length - 1, Math.ceil(b) + 1);
  return `${line}L${x(i1).toFixed(1)},${base}L${x(i0).toFixed(1)},${base}Z`;
}

const MIN_SPAN = 12;

/** Keep a zoom window inside the series and at least a year wide. */
export function clampWin(a: number, b: number, n: number): [number, number] {
  const lo = -0.5;
  const hi = n - 0.5;
  let span = Math.max(MIN_SPAN, b - a);
  span = Math.min(span, hi - lo);
  let s = (a + b) / 2 - span / 2;
  s = Math.max(lo, Math.min(hi - span, s));
  return [s, s + span];
}
