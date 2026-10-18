/**
 * A centred, aligned planetary dipole (Earth-like, moment pointing south so
 * the field at the equator points north) and the guiding-centre theory the
 * demo checks its Boris-pushed particles against. The engine has no planetary
 * field model; this field is the demo's, the integrator is the engine's.
 */
import { C, EARTH_RADIUS, ME, MP, QE } from './boris.ts';

export const RE = EARTH_RADIUS;
/** equatorial surface field, tesla */
export const B0 = 3.12e-5;
/** particles below this altitude are lost to the atmosphere */
export const ATMOSPHERE_M = 100e3;

const K = B0 * RE * RE * RE;

/** field at (x, y, z) metres, written into out[0..2] tesla */
export function dipoleField(x: number, y: number, z: number, out: Float64Array): void {
  const r2 = x * x + y * y + z * z;
  const r = Math.sqrt(r2);
  const inv5 = 1 / (r2 * r2 * r);
  out[0] = -K * 3 * z * x * inv5;
  out[1] = -K * 3 * z * y * inv5;
  out[2] = -K * (3 * z * z - r2) * inv5;
}

export type Species = 'p' | 'e';

export function speciesOf(sp: Species) {
  return sp === 'p' ? { q: QE, m: MP, name: 'proton' } : { q: -QE, m: ME, name: 'electron' };
}

/** B(lambda) / B_eq along a dipole field line */
const bRatio = (lam: number) => {
  const s = Math.sin(lam);
  const c = Math.cos(lam);
  return Math.sqrt(1 + 3 * s * s) / (c * c * c * c * c * c);
};

/** latitude where a particle of equatorial pitch angle alpha mirrors */
export function mirrorLatitude(alpha: number): number {
  const target = 1 / (Math.sin(alpha) ** 2);
  let lo = 0;
  let hi = Math.PI / 2 - 1e-9;
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (lo + hi);
    if (bRatio(mid) < target) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** equatorial loss-cone half angle on shell L, radians */
export function lossCone(L: number): number {
  const c2 = Math.min(1, (1 + ATMOSPHERE_M / RE) / L);
  const lam = Math.acos(Math.sqrt(c2));
  return Math.asin(Math.sqrt(1 / bRatio(lam)));
}

export type DipoleTheory = {
  gamma: number;
  speed: number;
  momentum: number;
  bEq: number;
  gyroRadius: number;
  gyroPeriod: number;
  mirrorLat: number;
  bounce: number;
  /** signed bounce-averaged drift angular rate, rad/s (negative is westward) */
  driftRate: number;
  drift: number;
  lossCone: number;
};

/**
 * Exact bounce-averaged guiding-centre periods for a dipole, by quadrature.
 * dt = ds / v_par, drift = (gamma m / qB)(v_par^2 + v_perp^2 / 2) / R_c (curl-free field).
 */
export function dipoleTheory(sp: Species, kineticMeV: number, alpha: number, L: number): DipoleTheory {
  const { q, m } = speciesOf(sp);
  const aq = Math.abs(q);
  const mc2 = m * C * C;
  const gamma = 1 + (kineticMeV * 1e6 * QE) / mc2;
  const speed = C * Math.sqrt(1 - 1 / (gamma * gamma));
  const momentum = gamma * m * speed;
  const bEq = B0 / (L * L * L);
  const sa = Math.sin(alpha);
  const sa2 = sa * sa;
  const lamM = mirrorLatitude(alpha);

  // lambda = lamM sin(theta) removes the 1/sqrt singularity at the mirror point
  const N = 1600;
  let tInt = 0;
  let phiInt = 0;
  for (let i = 0; i < N; i++) {
    const th = ((i + 0.5) / N) * (Math.PI / 2);
    const lam = lamM * Math.sin(th);
    const dlam = lamM * Math.cos(th) * (Math.PI / 2 / N);
    const s = Math.sin(lam);
    const c = Math.cos(lam);
    const root = Math.sqrt(1 + 3 * s * s);
    const b = bRatio(lam);
    const sinLoc2 = Math.min(1, sa2 * b);
    const vpar = speed * Math.sqrt(Math.max(1 - sinLoc2, 1e-300));
    const ds = L * RE * c * root * dlam;
    const dt = ds / vpar;
    const r = L * RE * c * c;
    const rc = (L * RE * c * root * root * root) / (3 * (1 + s * s));
    const vd = ((gamma * m * speed * speed) / (aq * bEq * b * rc)) * (1 - sinLoc2 + 0.5 * sinLoc2);
    tInt += dt;
    phiInt += (vd / (r * c)) * dt;
  }
  const bounce = 4 * tInt;
  // ions drift west (clockwise seen from the north), electrons east
  const driftRate = (q > 0 ? -1 : 1) * (phiInt / tInt);
  return {
    gamma,
    speed,
    momentum,
    bEq,
    gyroRadius: (momentum * sa) / (aq * bEq),
    gyroPeriod: (2 * Math.PI * gamma * m) / (aq * bEq),
    mirrorLat: lamM,
    bounce,
    driftRate,
    drift: (2 * Math.PI) / Math.abs(driftRate),
    lossCone: lossCone(L),
  };
}
