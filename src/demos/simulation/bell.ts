// Bell replay engine: the 245 valid Delft 2015 trials in recorded order (claims ST-F50, ST-F51), and a local
// hidden-variable model answering the very same random settings (the classical stand-in; win probability 3/4).
import { csprngUniform } from './data';
import { ChshTally, diskCovariance, diskPoint, lhvOutcome, type BellTrial } from './math';

const TRAIL_MIN = 5;

export interface Track {
  tally: ChshTally;
  S: Float64Array; // running S after trial i (NaN until every setting has two trials)
  err: Float64Array;
  px: Float64Array; // running CHSH-disk point (NaN until every setting has TRAIL_MIN trials)
  py: Float64Array;
  last: BellTrial | null;
}

export interface BellRun {
  n: number;
  total: number;
  pass: number;
  real: Track;
  lhv: Track;
}

function track(total: number): Track {
  const nan = () => new Float64Array(total).fill(NaN);
  return { tally: new ChshTally(), S: nan(), err: nan(), px: nan(), py: nan(), last: null };
}

export function newBellRun(total: number, pass: number): BellRun {
  return { n: 0, total, pass, real: track(total), lhv: track(total) };
}

function record(t: Track, i: number, trial: BellTrial) {
  t.tally.push(trial);
  t.last = trial;
  if (!t.tally.ready) return;
  t.S[i] = t.tally.S();
  t.err[i] = t.tally.sError();
  const [x, y] = diskPoint(t.tally.correlations());
  // the disk trail starts once every setting has a few trials; earlier points are mostly sampling noise
  if (Math.min(...t.tally.counts) >= TRAIL_MIN) {
    t.px[i] = x;
    t.py[i] = y;
  }
}

export function advanceBell(run: BellRun, trials: readonly BellTrial[], count: number) {
  for (let k = 0; k < count && run.n < run.total; k++) {
    const i = run.n;
    const real = trials[i];
    record(run.real, i, real);
    const lambda = csprngUniform() * 2 * Math.PI;
    const [x, y] = lhvOutcome(real.a, real.b, lambda);
    record(run.lhv, i, { t: real.t, a: real.a, b: real.b, x, y });
    run.n += 1;
  }
}

/** 1-sigma ellipse of the disk point: semi-axes along (1,1)/sqrt2 and (1,-1)/sqrt2 */
export function ellipse(t: Track): { rx: number; ry: number } | null {
  if (!t.tally.ready) return null;
  const [vx, , c] = diskCovariance(t.tally.errors());
  return { rx: Math.sqrt(Math.max(0, vx + c)), ry: Math.sqrt(Math.max(0, vx - c)) };
}
