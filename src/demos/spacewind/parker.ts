/**
 * The engine's analytic heliosphere (src/fields.c) restricted to the ecliptic,
 * with its default parameters (sw_solar_wind_default), streams, turbulence,
 * shear and CME off; and its sail force laws (src/spacecraft.c) with the
 * default vehicle and sun-cone controller (sw_vehicle_default,
 * sw_controller_default), integrated by fixed-step RK4 like configs/baseline_1au.cfg.
 */
import { AU, C, DAY, EPS0, KB, MP, QE, SOLAR_CONSTANT_1AU, SOLAR_MU, SOLAR_RADIUS, SOLAR_ROTATION_RATE, YEAR } from './boris.ts';

export type WindModel = {
  centralMu: number;
  protonT: number;
  electronT: number;
  refRadius: number;
  refDensity: number;
  refBr: number;
  omega: number;
  sourceSurface: number;
};

/** sw_solar_wind_default, with an optional coronal temperature for both species */
export function windModel(temperatureK = 8.0e5): WindModel {
  return {
    centralMu: SOLAR_MU,
    protonT: temperatureK,
    electronT: temperatureK,
    refRadius: AU,
    refDensity: 5.0e6,
    refBr: 3.0e-9,
    omega: SOLAR_ROTATION_RATE,
    sourceSurface: 2.5 * SOLAR_RADIUS,
  };
}

/** sw_parker_sound_speed */
export const soundSpeed = (w: WindModel) => Math.sqrt((KB * (w.protonT + w.electronT)) / MP);
/** sw_parker_critical_radius */
export const criticalRadius = (w: WindModel) => {
  const cs = soundSpeed(w);
  return w.centralMu / (2 * cs * cs);
};

const parkerEq = (y: number, rhs: number) => y - Math.log(y) - rhs;

/** sw_parker_speed: transonic branch by safeguarded bisection */
export function parkerSpeed(w: WindModel, r: number): number {
  const cs = soundSpeed(w);
  const rc = criticalRadius(w);
  if (r <= 0) return 0;
  if (Math.abs(r - rc) <= 1e-12 * rc) return cs;
  let rhs = 4 * Math.log(r / rc) + (4 * rc) / r - 3;
  rhs = Math.max(rhs, 1);
  let lo: number;
  let hi: number;
  if (r < rc) {
    lo = 2.2250738585072014e-308 * 16;
    hi = 1;
  } else {
    lo = 1;
    hi = Math.max(2, rhs + Math.log(rhs + 1) + 2);
    while (parkerEq(hi, rhs) <= 0 && hi < 1e12) hi *= 2;
  }
  let fLo = parkerEq(lo, rhs);
  const fHi = parkerEq(hi, rhs);
  if (fLo === 0) return cs * Math.sqrt(lo);
  if (fHi === 0) return cs * Math.sqrt(hi);
  for (let i = 0; i < 120; i++) {
    const mid = 0.5 * (lo + hi);
    const fMid = parkerEq(mid, rhs);
    if (Math.abs(fMid) < 1e-13) return cs * Math.sqrt(mid);
    if ((fLo > 0 && fMid > 0) || (fLo < 0 && fMid < 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return cs * Math.sqrt(0.5 * (lo + hi));
}

/** tabulated speed on a log-radius grid, for the per-frame parcel update */
export class SpeedTable {
  readonly r0: number;
  readonly r1 = 3 * AU;
  readonly n = 900;
  readonly v: Float64Array;
  /** spiral phase lag phi(r) = -Omega * int (r' - r_s) / (r' u) dr', radians */
  readonly lag: Float64Array;
  /** travel time from the source surface, seconds */
  readonly tau: Float64Array;
  private readonly k: number;
  constructor(w: WindModel) {
    this.r0 = w.sourceSurface * 1.0001;
    this.v = new Float64Array(this.n);
    this.lag = new Float64Array(this.n);
    this.tau = new Float64Array(this.n);
    this.k = (this.n - 1) / Math.log(this.r1 / this.r0);
    let prevR = this.r0;
    let prevF = 0;
    for (let i = 0; i < this.n; i++) {
      const r = this.radius(i);
      this.v[i] = parkerSpeed(w, r);
      const f = (r - w.sourceSurface) / (r * this.v[i]);
      if (i > 0) {
        this.lag[i] = this.lag[i - 1] - w.omega * 0.5 * (f + prevF) * (r - prevR);
        this.tau[i] = this.tau[i - 1] + (2 * (r - prevR)) / (this.v[i] + this.v[i - 1]);
      }
      prevR = r;
      prevF = f;
    }
  }
  radius(i: number) {
    return this.r0 * Math.exp(i / this.k);
  }
  private at(arr: Float64Array, r: number) {
    const x = Math.log(Math.max(r, this.r0) / this.r0) * this.k;
    const i = Math.min(this.n - 2, Math.floor(x));
    const f = Math.min(1, x - i);
    return arr[i] * (1 - f) + arr[i + 1] * f;
  }
  /** radius reached after travelling for time s from the source surface */
  radiusAfter(s: number) {
    let lo = 0;
    let hi = this.n - 1;
    if (s >= this.tau[hi]) return this.r1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.tau[mid] <= s) lo = mid;
      else hi = mid;
    }
    const f = (s - this.tau[lo]) / (this.tau[hi] - this.tau[lo]);
    return this.radius(lo) * (1 - f) + this.radius(hi) * f;
  }
  speed(r: number) {
    return this.at(this.v, r);
  }
  phase(r: number) {
    return this.at(this.lag, r);
  }
}

export type WindSample = {
  speed: number;
  density: number;
  br: number;
  bphi: number;
  b: number;
  spiralDeg: number;
  photonFlux: number;
  debye: number;
  dynamicPressure: number;
};

/** sw_environment_evaluate in the ecliptic (sin theta = 1) */
export function windAt(w: WindModel, r: number, vRef = parkerSpeed(w, w.refRadius)): WindSample {
  const v = parkerSpeed(w, r);
  const density = w.refDensity * (w.refRadius / r) ** 2 * (vRef / Math.max(v, 1));
  const br = w.refBr * (w.refRadius / r) ** 2;
  const bphi = (-br * w.omega * (r - w.sourceSurface)) / Math.max(v, 1);
  return {
    speed: v,
    density,
    br,
    bphi,
    b: Math.hypot(br, bphi),
    spiralDeg: (Math.atan2(Math.abs(bphi), br) * 180) / Math.PI,
    photonFlux: SOLAR_CONSTANT_1AU * (AU / r) ** 2,
    debye: Math.sqrt((EPS0 * KB * Math.max(w.electronT, 1)) / Math.max(density * QE * QE, 2.2250738585072014e-308)),
    dynamicPressure: density * MP * v * v,
  };
}

// --------------------------------------------------------------- the sail craft

export type SailMode = 'off' | 'photon' | 'esail';

/** sw_vehicle_default / configs/baseline_1au.cfg */
export const VEHICLE = {
  mass: 12,
  area: 100,
  reflectivity: 0.88,
  absorptivity: 0.12,
  tetherLength: 20000,
  tetherVoltage: 20000,
  cd: 1.0,
  cl: 0.15,
  maxRadius: 200,
  sunCone: (25 * Math.PI) / 180,
};

type V2 = [number, number];
const norm = (a: V2): V2 => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
/** sw_unit_perpendicular: the part of `preferred` normal to `dir`, normalised */
const unitPerp = (dir: V2, preferred: V2): V2 => {
  const d = norm(dir);
  const k = dot(preferred, d);
  return norm([preferred[0] - k * d[0], preferred[1] - k * d[1]]);
};

export type SailForces = { radiation: V2; esail: V2; normal: V2; esailRadius: number };

/** non-gravitational force on the craft, newtons, with the sun-cone attitude tracked exactly */
export function sailForces(w: WindModel, mode: SailMode, pos: V2, vel: V2, vRef?: number): SailForces {
  const r = Math.hypot(pos[0], pos[1]);
  const radial = norm(pos);
  const prograde = unitPerp(radial, vel);
  const c = Math.cos(VEHICLE.sunCone);
  const s = Math.sin(VEHICLE.sunCone);
  let normal = norm([radial[0] * c + prograde[0] * s, radial[1] * c + prograde[1] * s]);
  const out: SailForces = { radiation: [0, 0], esail: [0, 0], normal, esailRadius: 0 };
  if (mode === 'off') return out;
  const env = windAt(w, r, vRef);
  // sw_solar_radiation_force
  let cosine = dot(normal, radial);
  if (cosine < 0) {
    normal = [-normal[0], -normal[1]];
    cosine = -cosine;
  }
  cosine = Math.min(1, Math.max(0, cosine));
  const p = env.photonFlux / C;
  const ab = p * VEHICLE.area * VEHICLE.absorptivity * cosine;
  const rf = p * VEHICLE.area * 2 * VEHICLE.reflectivity * cosine * cosine;
  out.radiation = [radial[0] * ab + normal[0] * rf, radial[1] * ab + normal[1] * rf];
  if (mode !== 'esail') return out;
  // sw_electric_sail_force
  const wind: V2 = [radial[0] * env.speed - vel[0], radial[1] * env.speed - vel[1]];
  const q = env.density * MP * dot(wind, wind);
  const thermal = KB * Math.max(w.electronT, 1);
  const volt = QE * Math.abs(VEHICLE.tetherVoltage);
  const radius = Math.min(Math.max(env.debye * Math.sqrt(Math.log1p(volt / thermal)), 0), VEHICLE.maxRadius);
  out.esailRadius = radius;
  const area = 2 * VEHICLE.tetherLength * radius;
  if (area <= 0 || q <= 0) return out;
  const drag = norm(wind);
  const liftReq = unitPerp(wind, prograde);
  const lift = unitPerp(drag, liftReq);
  out.esail = [(drag[0] * VEHICLE.cd + lift[0] * VEHICLE.cl) * q * area, (drag[1] * VEHICLE.cd + lift[1] * VEHICLE.cl) * q * area];
  return out;
}

export type Track = { t: Float64Array; x: Float64Array; y: Float64Array; step: number };

/** fixed-step RK4 from the baseline initial state: 1 AU at circular speed */
export function integrateCraft(w: WindModel, mode: SailMode, years = 3, stepS = 6 * 3600): Track {
  const vRef = parkerSpeed(w, w.refRadius);
  const n = Math.ceil((years * YEAR) / stepS) + 1;
  const tr: Track = { t: new Float64Array(n), x: new Float64Array(n), y: new Float64Array(n), step: stepS };
  let st = [AU, 0, 0, Math.sqrt(SOLAR_MU / AU)];
  const rhs = (y: number[]): number[] => {
    const r2 = y[0] * y[0] + y[1] * y[1];
    const r = Math.sqrt(r2);
    const g = -SOLAR_MU / (r2 * r);
    const f = sailForces(w, mode, [y[0], y[1]], [y[2], y[3]], vRef);
    const ax = g * y[0] + (f.radiation[0] + f.esail[0]) / VEHICLE.mass;
    const ay = g * y[1] + (f.radiation[1] + f.esail[1]) / VEHICLE.mass;
    return [y[2], y[3], ax, ay];
  };
  for (let i = 0; i < n; i++) {
    tr.t[i] = i * stepS;
    tr.x[i] = st[0];
    tr.y[i] = st[1];
    const k1 = rhs(st);
    const k2 = rhs(st.map((v, j) => v + 0.5 * stepS * k1[j]));
    const k3 = rhs(st.map((v, j) => v + 0.5 * stepS * k2[j]));
    const k4 = rhs(st.map((v, j) => v + stepS * k3[j]));
    st = st.map((v, j) => v + (stepS / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
  }
  return tr;
}

export { AU, DAY, YEAR, SOLAR_RADIUS };
