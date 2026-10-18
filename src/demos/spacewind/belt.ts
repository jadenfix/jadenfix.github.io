/**
 * Radiation-belt particles: each one is advanced by the engine's relativistic
 * Boris pusher through the dipole, with its own clock and an adaptive step of
 * a fixed fraction of the local gyro-period. Trails are ring buffers in Earth
 * radii. Everything here is plain arrays so a frame never allocates.
 */
import { relBorisPush } from './boris.ts';
import { ATMOSPHERE_M, dipoleField, dipoleTheory, RE, speciesOf, type DipoleTheory, type Species } from './dipole.ts';

export const TRAIL_CAP = 340;
/** trail samples per wall-clock second */
const SAMPLES_PER_WALL_S = 90;
/**
 * Boris step: omega_c dt at the strongest field the particle meets (its mirror
 * point). A fixed step per particle keeps the leapfrog staggering exact, which is
 * what preserves the magnetic moment over thousands of bounces.
 */
const OMEGA_DT = 0.3;
const STEP_BUDGET = 60_000;
export const L_MIN = 2.5;
export const L_MAX = 3.5;
export const L_MID = 3;
const SECTOR = (70 * Math.PI) / 180;

export type BeltParams = { species: Species; mev: number; alphaDeg: number; count: number };

export type Flash = { x: number; y: number; z: number; age: number };

/** small deterministic generator so a given setting always injects the same cloud */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Belt {
  readonly p: BeltParams;
  readonly th: DipoleTheory;
  readonly q: number;
  readonly m: number;
  readonly n: number;
  /** sim seconds per wall second */
  readonly rate: number;
  rateScale = 1;
  readonly sampleDt: number;
  simTime = 0;
  readonly s: Float64Array;
  readonly clock: Float64Array;
  readonly sampleAcc: Float64Array;
  readonly trail: Float32Array;
  readonly head: Int32Array;
  readonly len: Int32Array;
  readonly lShell: Float64Array;
  readonly gamma0: Float64Array;
  readonly dt: Float64Array;
  // measurement
  readonly t0: Float64Array;
  readonly phi0: Float64Array;
  readonly phiU: Float64Array;
  readonly armed: Uint8Array;
  readonly crossings: Int32Array;
  readonly firstCross: Float64Array;
  readonly lastCross: Float64Array;
  maxEnergyErr = 0;
  lost = 0;
  flashes: Flash[] = [];
  private rnd: () => number;
  private readonly b = new Float64Array(3);
  private readonly cos0: number;

  constructor(p: BeltParams) {
    this.p = p;
    const alpha = (p.alphaDeg * Math.PI) / 180;
    this.th = dipoleTheory(p.species, p.mev, alpha, L_MID);
    const sp = speciesOf(p.species);
    this.q = sp.q;
    this.m = sp.m;
    this.n = p.count;
    // a bounce of about 3 s on screen, a drift lap of at most about 70 s, never a bounce faster than 0.6 s
    const want = Math.max(this.th.bounce / 3, this.th.drift / 70);
    this.rate = Math.min(want, this.th.bounce / 0.6);
    this.sampleDt = this.rate / SAMPLES_PER_WALL_S;
    const n = this.n;
    this.s = new Float64Array(6 * n);
    this.clock = new Float64Array(n);
    this.sampleAcc = new Float64Array(n);
    this.trail = new Float32Array(3 * TRAIL_CAP * n);
    this.head = new Int32Array(n);
    this.len = new Int32Array(n);
    this.lShell = new Float64Array(n);
    this.gamma0 = new Float64Array(n);
    this.dt = new Float64Array(n);
    this.t0 = new Float64Array(n);
    this.phi0 = new Float64Array(n);
    this.phiU = new Float64Array(n);
    this.armed = new Uint8Array(n);
    this.crossings = new Int32Array(n);
    this.firstCross = new Float64Array(n);
    this.lastCross = new Float64Array(n);
    this.cos0 = Math.cos(alpha);
    this.rnd = mulberry(1 + Math.round(p.mev * 97) + p.alphaDeg * 7919 + p.count * 31 + (p.species === 'e' ? 104729 : 0));
    for (let i = 0; i < n; i++) this.inject(i, 0);
  }

  /** place particle i on the equator with its guiding centre on shell L, inside the injection sector */
  private inject(i: number, t: number) {
    const r = this.rnd;
    const L = L_MIN + (L_MAX - L_MIN) * r();
    const phi = -0.35 + (r() - 0.5) * SECTOR;
    const gx = L * RE * Math.cos(phi);
    const gy = L * RE * Math.sin(phi);
    const v = this.th.speed;
    const sa = Math.sqrt(1 - this.cos0 * this.cos0);
    const vpar = v * this.cos0 * (r() < 0.5 ? -1 : 1);
    const g = r() * Math.PI * 2;
    // perpendicular basis at the equator: B is along +z there
    const ex = Math.cos(phi);
    const ey = Math.sin(phi);
    const vx = v * sa * (Math.cos(g) * ex - Math.sin(g) * ey);
    const vy = v * sa * (Math.cos(g) * ey + Math.sin(g) * ex);
    const vz = vpar;
    const B = this.b;
    dipoleField(gx, gy, 0, B);
    const b2 = B[0] * B[0] + B[1] * B[1] + B[2] * B[2];
    const k = (this.th.gamma * this.m) / (this.q * b2);
    // particle = guiding centre + gamma m (B x v) / (q B^2)
    const o = 6 * i;
    this.s[o] = gx + k * (B[1] * vz - B[2] * vy);
    this.s[o + 1] = gy + k * (B[2] * vx - B[0] * vz);
    this.s[o + 2] = k * (B[0] * vy - B[1] * vx);
    this.s[o + 3] = vx;
    this.s[o + 4] = vy;
    this.s[o + 5] = vz;
    this.clock[i] = t;
    this.sampleAcc[i] = 0;
    this.head[i] = 0;
    this.len[i] = 0;
    this.lShell[i] = L;
    this.gamma0[i] = this.gammaOf(i);
    {
      // strongest field on this shell's bounce: the mirror point, or the field at the foot
      const bEq = Math.sqrt(b2);
      const lam = Math.acos(Math.sqrt(Math.min(1, (RE + ATMOSPHERE_M) / (L * RE))));
      const sl = Math.sin(lam);
      const bFoot = (bEq * Math.sqrt(1 + 3 * sl * sl)) / Math.cos(lam) ** 6;
      const bMax = Math.min(bEq / (sa * sa), bFoot) * 1.05;
      this.dt[i] = (OMEGA_DT * this.gamma0[i] * this.m) / (Math.abs(this.q) * bMax);
    }
    this.t0[i] = t;
    this.phi0[i] = Math.atan2(this.s[o + 1], this.s[o]);
    this.phiU[i] = this.phi0[i];
    this.armed[i] = 0;
    this.crossings[i] = 0;
    this.push(i);
  }

  private gammaOf(i: number) {
    const o = 6 * i;
    const v2 = this.s[o + 3] ** 2 + this.s[o + 4] ** 2 + this.s[o + 5] ** 2;
    return 1 / Math.sqrt(1 - v2 / (299792458 * 299792458));
  }

  private push(i: number) {
    const o = 6 * i;
    const h = this.head[i];
    const base = 3 * (i * TRAIL_CAP + h);
    this.trail[base] = this.s[o] / RE;
    this.trail[base + 1] = this.s[o + 1] / RE;
    this.trail[base + 2] = this.s[o + 2] / RE;
    this.head[i] = (h + 1) % TRAIL_CAP;
    if (this.len[i] < TRAIL_CAP) this.len[i]++;
  }

  /** bookkeeping at each trail sample: unwrap longitude, count north-going equator transits */
  private measure(i: number) {
    const o = 6 * i;
    const x = this.s[o];
    const y = this.s[o + 1];
    const z = this.s[o + 2];
    const phi = Math.atan2(y, x);
    let d = phi - (this.phiU[i] % (2 * Math.PI));
    d = ((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    this.phiU[i] += d;
    const lat = Math.atan2(z, Math.hypot(x, y));
    const thr = this.th.mirrorLat / 3;
    if (lat < -thr) this.armed[i] = 1;
    else if (lat > thr && this.armed[i]) {
      this.armed[i] = 0;
      if (this.crossings[i] === 0) this.firstCross[i] = this.clock[i];
      this.lastCross[i] = this.clock[i];
      this.crossings[i]++;
    }
  }

  /** advance every particle to simTime + wall * rate, within a per-frame step budget */
  advance(wall: number) {
    this.simTime += wall * this.rate * this.rateScale;
    const target = this.simTime;
    const n = this.n;
    const budget = Math.floor(STEP_BUDGET / n);
    const B = this.b;
    const q = this.q;
    const m = this.m;
    const s = this.s;
    const rAtm = RE + ATMOSPHERE_M;
    let hit = false;
    let steps = 0;
    for (let i = 0; i < n; i++) {
      const o = 6 * i;
      const h = this.dt[i];
      let k = 0;
      while (this.clock[i] < target && k < budget) {
        dipoleField(s[o], s[o + 1], s[o + 2], B);
        relBorisPush(s, o, q, m, 0, 0, 0, B[0], B[1], B[2], h);
        this.clock[i] += h;
        k++;
        this.sampleAcc[i] += h;
        if (this.sampleAcc[i] >= this.sampleDt) {
          this.sampleAcc[i] -= this.sampleDt;
          this.push(i);
          this.measure(i);
        }
        const r = Math.sqrt(s[o] * s[o] + s[o + 1] * s[o + 1] + s[o + 2] * s[o + 2]);
        if (r < rAtm) {
          this.flashes.push({ x: s[o] / RE, y: s[o + 1] / RE, z: s[o + 2] / RE, age: 0 });
          this.lost++;
          this.inject(i, this.clock[i]);
          break;
        }
      }
      steps += k;
      if (k >= budget) hit = true;
      const err = Math.abs(this.gammaOf(i) - this.gamma0[i]) / (this.gamma0[i] - 1);
      if (err > this.maxEnergyErr) this.maxEnergyErr = err;
    }
    if (hit) this.rateScale = Math.max(0.05, this.rateScale * 0.9);
    else if (this.rateScale < 1 && steps < STEP_BUDGET * 0.5) this.rateScale = Math.min(1, this.rateScale * 1.03);
    for (const f of this.flashes) f.age += wall;
    if (this.flashes.length) this.flashes = this.flashes.filter((f) => f.age < 2.2);
    if (this.flashes.length > 160) this.flashes.splice(0, this.flashes.length - 160);
  }

  /** averaged measured periods, null until enough motion has been seen */
  measured() {
    let rateSum = 0;
    let rateN = 0;
    let bSum = 0;
    let bN = 0;
    for (let i = 0; i < this.n; i++) {
      const span = this.clock[i] - this.t0[i];
      if (span > 2.2 * this.th.bounce) {
        rateSum += (this.phiU[i] - this.phi0[i]) / span;
        rateN++;
      }
      if (this.crossings[i] >= 4) {
        bSum += (this.crossings[i] - 1) / (this.lastCross[i] - this.firstCross[i]);
        bN++;
      }
    }
    const driftRate = rateN ? rateSum / rateN : null;
    return {
      bounce: bN ? bN / bSum : null,
      drift: driftRate ? (2 * Math.PI) / Math.abs(driftRate) : null,
      driftRate,
    };
  }
}
