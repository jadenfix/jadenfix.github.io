/**
 * Spacewind's charged-particle pushers, ported line for line from
 * src/plasma.c (sw_boris_push, sw_relativistic_boris_push).
 *
 * State lives in a flat Float64Array so thousands of steps a frame stay
 * allocation free: s[o..o+2] position (m), s[o+3..o+5] velocity (m/s).
 */

// include/spacewind/constants.h
export const C = 299792458.0;
export const QE = 1.602176634e-19;
export const ME = 9.1093837139e-31;
export const MP = 1.67262192369e-27;
export const KB = 1.380649e-23;
export const EPS0 = 8.8541878128e-12;
export const MU0 = 1.25663706212e-6;
export const AU = 149597870700.0;
export const SOLAR_MU = 1.32712440018e20;
export const SOLAR_RADIUS = 6.957e8;
export const SOLAR_ROTATION_RATE = 2.86533e-6;
export const SOLAR_CONSTANT_1AU = 1361.0;
export const EARTH_RADIUS = 6.371e6;
export const DAY = 86400.0;
export const YEAR = 31557600.0;

/** sw_boris_push: half electric kick, exact-norm magnetic rotation, half kick, drift. */
export function borisPush(
  s: Float64Array,
  o: number,
  q: number,
  m: number,
  ex: number,
  ey: number,
  ez: number,
  bx: number,
  by: number,
  bz: number,
  dt: number,
): void {
  const qmdt2 = (q * dt) / (2 * m);
  const vmx = s[o + 3] + ex * qmdt2;
  const vmy = s[o + 4] + ey * qmdt2;
  const vmz = s[o + 5] + ez * qmdt2;
  const tx = bx * qmdt2;
  const ty = by * qmdt2;
  const tz = bz * qmdt2;
  const k = 2 / (1 + (tx * tx + ty * ty + tz * tz));
  const sx = tx * k;
  const sy = ty * k;
  const sz = tz * k;
  const vpx = vmx + (vmy * tz - vmz * ty);
  const vpy = vmy + (vmz * tx - vmx * tz);
  const vpz = vmz + (vmx * ty - vmy * tx);
  const vx = vmx + (vpy * sz - vpz * sy) + ex * qmdt2;
  const vy = vmy + (vpz * sx - vpx * sz) + ey * qmdt2;
  const vz = vmz + (vpx * sy - vpy * sx) + ez * qmdt2;
  s[o + 3] = vx;
  s[o + 4] = vy;
  s[o + 5] = vz;
  s[o] += vx * dt;
  s[o + 1] += vy * dt;
  s[o + 2] += vz * dt;
}

/** sw_relativistic_boris_push: the same rotation applied to u = gamma v. */
export function relBorisPush(
  s: Float64Array,
  o: number,
  q: number,
  m: number,
  ex: number,
  ey: number,
  ez: number,
  bx: number,
  by: number,
  bz: number,
  dt: number,
): void {
  const c2 = C * C;
  const v2 = s[o + 3] * s[o + 3] + s[o + 4] * s[o + 4] + s[o + 5] * s[o + 5];
  const gamma0 = 1 / Math.sqrt(Math.max(1 - Math.min(v2 / c2, 1 - 1e-15), 1e-15));
  const qmdt2 = (q * dt) / (2 * m);
  const umx = s[o + 3] * gamma0 + ex * qmdt2;
  const umy = s[o + 4] * gamma0 + ey * qmdt2;
  const umz = s[o + 5] * gamma0 + ez * qmdt2;
  const gammaMinus = Math.sqrt(1 + (umx * umx + umy * umy + umz * umz) / c2);
  const f = qmdt2 / gammaMinus;
  const tx = bx * f;
  const ty = by * f;
  const tz = bz * f;
  const k = 2 / (1 + (tx * tx + ty * ty + tz * tz));
  const sx = tx * k;
  const sy = ty * k;
  const sz = tz * k;
  const upx = umx + (umy * tz - umz * ty);
  const upy = umy + (umz * tx - umx * tz);
  const upz = umz + (umx * ty - umy * tx);
  const ux = umx + (upy * sz - upz * sy) + ex * qmdt2;
  const uy = umy + (upz * sx - upx * sz) + ey * qmdt2;
  const uz = umz + (upx * sy - upy * sx) + ez * qmdt2;
  const gammaNew = Math.sqrt(1 + (ux * ux + uy * uy + uz * uz) / c2);
  const vx = ux / gammaNew;
  const vy = uy / gammaNew;
  const vz = uz / gammaNew;
  s[o + 3] = vx;
  s[o + 4] = vy;
  s[o + 5] = vz;
  s[o] += vx * dt;
  s[o + 1] += vy * dt;
  s[o + 2] += vz * dt;
}
