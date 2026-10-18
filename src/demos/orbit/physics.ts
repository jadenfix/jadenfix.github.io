/**
 * Timelike equatorial geodesics of a Schwarzschild black hole, G = c = M = 1.
 *
 * With u = 1/r the orbit obeys u'' = 1/L^2 - u + 3u^2 (prime = d/dphi). An orbit is labelled by its
 * semi-latus rectum p and eccentricity e, so periapsis r_p = p/(1+e) and apoapsis r_a = p/(1-e):
 *   L^2 = p^2 / (p - 3 - e^2)
 *   E^2 = ((p-2)^2 - 4e^2) / (p (p - 3 - e^2))
 * and the coordinate time follows dt/dphi = E r^2 / (L (1 - 2/r)).
 * Stable bound orbits need p > 6 + 2e (the separatrix); below it the particle released at r_p plunges.
 */

export type Orbit = {
  p: number;
  e: number;
  L: number;
  E: number;
  rp: number;
  ra: number;
  stable: boolean;
  /** stable: phi from one periapsis to the next (rad). plunge: phi at the end of the table. */
  phiR: number;
  /** stable: coordinate time from one periapsis to the next. plunge: time at the end of the table. */
  Tr: number;
  /** periapsis advance per radial orbit from the RK4 integration, degrees (stable only) */
  advanceDeg: number;
  /** the same advance from the closed form with a complete elliptic integral, degrees (stable only) */
  advanceExactDeg: number;
  /** plunge only: true when the table reached r = 2.0008 (false: still whirling at the cap) */
  reachedHorizon: boolean;
  /** table: phi, r, t; stable tables cover exactly one radial period [0, phiR] */
  phi: Float64Array;
  r: Float64Array;
  t: Float64Array;
  n: number;
};

/** the innermost stable orbit for a given eccentricity: p = 6 + 2e */
export const separatrix = (e: number) => 6 + 2 * e;
export const HORIZON = 2;
export const PHOTON_SPHERE = 3;
export const SHADOW = 3 * Math.sqrt(3);
/** a plunge table stops here if the particle is still whirling (only right at the separatrix) */
export const PLUNGE_PHI_CAP = 90;

type State = { u: number; w: number; t: number };

function rk4(s: State, h: number, invL2: number, EoverL: number): State {
  // u' = w, w' = 1/L^2 - u + 3u^2, t' = (E/L) / (u^2 (1 - 2u)); written out to stay allocation-light
  const u1 = s.u;
  const w1 = s.w;
  const b1 = invL2 - u1 + 3 * u1 * u1;
  const c1 = EoverL / (u1 * u1 * (1 - 2 * u1));
  const u2 = u1 + 0.5 * h * w1;
  const w2 = w1 + 0.5 * h * b1;
  const b2 = invL2 - u2 + 3 * u2 * u2;
  const c2 = EoverL / (u2 * u2 * (1 - 2 * u2));
  const u3 = u1 + 0.5 * h * w2;
  const w3 = w1 + 0.5 * h * b2;
  const b3 = invL2 - u3 + 3 * u3 * u3;
  const c3 = EoverL / (u3 * u3 * (1 - 2 * u3));
  const u4 = u1 + h * w3;
  const w4 = w1 + h * b3;
  const b4 = invL2 - u4 + 3 * u4 * u4;
  const c4 = EoverL / (u4 * u4 * (1 - 2 * u4));
  return {
    u: u1 + (h / 6) * (w1 + 2 * w2 + 2 * w3 + w4),
    w: w1 + (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4),
    t: s.t + (h / 6) * (c1 + 2 * c2 + 2 * c3 + c4),
  };
}

/** complete elliptic integral of the first kind K(m), m = k^2, by the arithmetic-geometric mean */
export function ellipticK(m: number): number {
  let a = 1;
  let b = Math.sqrt(1 - m);
  for (let i = 0; i < 30 && Math.abs(a - b) > 1e-15; i++) {
    const an = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = an;
  }
  return Math.PI / (2 * a);
}

/** closed form: phi per radial period = 4 sqrt(p / (p - 6 + 2e)) K(4e / (p - 6 + 2e)) */
export function exactAdvanceDeg(p: number, e: number): number {
  const d = p - 6 + 2 * e;
  const phiR = 4 * Math.sqrt(p / d) * ellipticK((4 * e) / d);
  return ((phiR - 2 * Math.PI) * 180) / Math.PI;
}

export function solveOrbit(p: number, e: number, samples = 1024): Orbit {
  const L2 = (p * p) / (p - 3 - e * e);
  const L = Math.sqrt(L2);
  const E = Math.sqrt(((p - 2) ** 2 - 4 * e * e) / (p * (p - 3 - e * e)));
  const rp = p / (1 + e);
  const ra = e < 1 ? p / (1 - e) : Infinity;
  const invL2 = 1 / L2;
  const EoverL = E / L;
  const stable = p > separatrix(e);
  const base = { p, e, L, E, rp, ra, stable };

  if (stable && e < 1e-6) {
    // circular: u stays at 1/p; the radial period is the epicyclic one
    const phiR = (2 * Math.PI) / Math.sqrt(1 - 6 / p);
    const dtdphi = (E * p * p) / (L * (1 - 2 / p));
    const n = samples + 1;
    const phi = new Float64Array(n);
    const r = new Float64Array(n).fill(p);
    const t = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      phi[i] = (phiR * i) / samples;
      t[i] = phi[i] * dtdphi;
    }
    const adv = ((phiR - 2 * Math.PI) * 180) / Math.PI;
    return { ...base, phiR, Tr: phiR * dtdphi, advanceDeg: adv, advanceExactDeg: adv, reachedHorizon: false, phi, r, t, n };
  }

  const start: State = { u: (1 + e) / p, w: 0, t: 0 };

  if (stable) {
    // integrate from periapsis until u' turns from negative to positive: that is apoapsis
    const h0 = 2e-3;
    let s = start;
    let phiNow = 0;
    for (let i = 0; i < 1e6; i++) {
      const next = rk4(s, h0, invL2, EoverL);
      if (next.w >= 0 && i > 0) {
        // bisect on the last step so the turning point is exact to integrator precision
        let lo = 0;
        let hi = h0;
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2;
          if (rk4(s, mid, invL2, EoverL).w < 0) lo = mid;
          else hi = mid;
        }
        phiNow += (lo + hi) / 2;
        break;
      }
      s = next;
      phiNow += h0;
    }
    const phiA = phiNow;
    const phiR = 2 * phiA;
    // a uniform table over the first half, mirrored for the second, so every orbit closes exactly
    const half = samples / 2;
    const h = phiA / half;
    const n = samples + 1;
    const phi = new Float64Array(n);
    const r = new Float64Array(n);
    const t = new Float64Array(n);
    let q = start;
    phi[0] = 0;
    r[0] = 1 / q.u;
    t[0] = 0;
    for (let i = 1; i <= half; i++) {
      q = rk4(q, h, invL2, EoverL);
      phi[i] = i * h;
      r[i] = 1 / q.u;
      t[i] = q.t;
    }
    const tA = t[half];
    for (let i = half + 1; i < n; i++) {
      const j = samples - i;
      phi[i] = phiR - phi[j];
      r[i] = r[j];
      t[i] = 2 * tA - t[j];
    }
    return {
      ...base,
      phiR,
      Tr: 2 * tA,
      advanceDeg: ((phiR - 2 * Math.PI) * 180) / Math.PI,
      advanceExactDeg: exactAdvanceDeg(p, e),
      reachedHorizon: false,
      phi,
      r,
      t,
      n,
    };
  }

  // plunge: released at r_p moving sideways, nothing turns it around; stop just outside r = 2
  const phiL: number[] = [0];
  const rL: number[] = [1 / start.u];
  const tL: number[] = [0];
  let s = start;
  let phiNow = 0;
  const uStop = 1 / 2.0008;
  for (let i = 0; i < 60000 && phiNow < PLUNGE_PHI_CAP; i++) {
    const gap = 1 - 2 * s.u;
    const h = Math.min(4e-3, (0.02 * gap) / Math.max(Math.abs(s.w), 1e-9));
    let next = rk4(s, h, invL2, EoverL);
    if (next.u >= uStop) {
      let lo = 0;
      let hi = h;
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        if (rk4(s, mid, invL2, EoverL).u < uStop) lo = mid;
        else hi = mid;
      }
      next = rk4(s, lo, invL2, EoverL);
      phiNow += lo;
      phiL.push(phiNow);
      rL.push(1 / next.u);
      tL.push(next.t);
      break;
    }
    s = next;
    phiNow += h;
    phiL.push(phiNow);
    rL.push(1 / s.u);
    tL.push(s.t);
  }
  const n = phiL.length;
  return {
    ...base,
    phiR: phiL[n - 1],
    Tr: tL[n - 1],
    advanceDeg: NaN,
    advanceExactDeg: NaN,
    reachedHorizon: rL[n - 1] < 2.001,
    phi: Float64Array.from(phiL),
    r: Float64Array.from(rL),
    t: Float64Array.from(tL),
    n,
  };
}

/** index i with t[i] <= time < t[i+1] */
function seek(arr: Float64Array, n: number, x: number): number {
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** position at coordinate time `time` (stable orbits repeat every Tr with phi advanced by phiR) */
export function atTime(o: Orbit, time: number): { phi: number; r: number } {
  let k = 0;
  let tl = time;
  if (o.stable) {
    k = Math.floor(time / o.Tr);
    tl = time - k * o.Tr;
  } else if (tl >= o.Tr) {
    return { phi: o.phi[o.n - 1], r: o.r[o.n - 1] };
  }
  if (tl <= 0) return { phi: k * o.phiR, r: o.r[0] };
  const i = seek(o.t, o.n, tl);
  const j = Math.min(i + 1, o.n - 1);
  const span = o.t[j] - o.t[i];
  const f = span > 0 ? (tl - o.t[i]) / span : 0;
  return { phi: k * o.phiR + o.phi[i] + f * (o.phi[j] - o.phi[i]), r: o.r[i] + f * (o.r[j] - o.r[i]) };
}

/** r at accumulated angle phi along the orbit */
export function atPhi(o: Orbit, phiTotal: number): number {
  let x = phiTotal;
  if (o.stable) x = phiTotal - Math.floor(phiTotal / o.phiR) * o.phiR;
  if (x >= o.phi[o.n - 1]) return o.r[o.n - 1];
  const i = seek(o.phi, o.n, x);
  const j = Math.min(i + 1, o.n - 1);
  const span = o.phi[j] - o.phi[i];
  const f = span > 0 ? (x - o.phi[i]) / span : 0;
  return o.r[i] + f * (o.r[j] - o.r[i]);
}
