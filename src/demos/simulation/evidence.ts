// Evidence engine: two bit streams (real NIST beacon bits, and a simulated source) and their running
// KT log Bayes factors. Mirrors simulation-theory claims ST-T01, ST-T185, ST-M50.
import { csprngUniform, type Beacon } from './data';
import { KTEvidence, VILLE_THRESHOLD, coarsened } from './math';

export type Mode = 'same' | 'biased' | 'coarsened';

const SIM_Q = 0.6;
const FLIP = 0.2;

export const MODES: Record<Mode, { label: string; q: number; horizon: number; sim: string }> = {
  same: { label: 'same law', q: 0.5, horizon: 8192, sim: 'csprng, q = 1/2' },
  biased: { label: 'biased', q: SIM_Q, horizon: 1024, sim: `q = ${SIM_Q.toFixed(2)}` },
  coarsened: { label: 'coarsened', q: coarsened(SIM_Q, FLIP), horizon: 2048, sim: `q = ${SIM_Q.toFixed(2)} via flip ${FLIP}` },
};

export interface Run {
  mode: Mode;
  offset: number; // first beacon bit used
  n: number;
  base: Float64Array;
  sim: Float64Array;
  baseBits: Uint8Array;
  simBits: Uint8Array;
  baseKT: KTEvidence;
  simKT: KTEvidence;
  crossed: number | null;
  baseCrossed: number | null;
}

export function newRun(mode: Mode, offset: number): Run {
  const h = MODES[mode].horizon;
  return {
    mode,
    offset,
    n: 0,
    base: new Float64Array(h),
    sim: new Float64Array(h),
    baseBits: new Uint8Array(h),
    simBits: new Uint8Array(h),
    baseKT: new KTEvidence(),
    simKT: new KTEvidence(),
    crossed: null,
    baseCrossed: null,
  };
}

/** one simulated bit, as the observer sees it */
function simBit(mode: Mode): number {
  if (mode === 'same') return csprngUniform() < 0.5 ? 1 : 0;
  const raw = csprngUniform() < SIM_Q ? 1 : 0;
  if (mode === 'biased') return raw;
  return csprngUniform() < FLIP ? 1 - raw : raw;
}

export function advance(run: Run, beacon: Beacon, count: number) {
  const h = MODES[run.mode].horizon;
  const total = beacon.bits.length;
  for (let k = 0; k < count && run.n < h; k++) {
    const i = run.n;
    const b = beacon.bits[(run.offset + i) % total];
    const s = simBit(run.mode);
    run.baseBits[i] = b;
    run.simBits[i] = s;
    run.base[i] = run.baseKT.push(b);
    run.sim[i] = run.simKT.push(s);
    if (run.crossed === null && run.sim[i] >= VILLE_THRESHOLD) run.crossed = i + 1;
    if (run.baseCrossed === null && run.base[i] >= VILLE_THRESHOLD) run.baseCrossed = i + 1;
    run.n += 1;
  }
}

