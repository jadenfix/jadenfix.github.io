import { HORIZON, SHADOW, atPhi, atTime, type Orbit } from './physics';

const VOID = '#0b0b0a';
const PHOS = [232, 169, 106] as const;
const BONE = [220, 214, 200] as const;
const ICE = [196, 204, 222] as const;
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** how many past radial orbits the faint rosette keeps */
export const ROSETTE_ORBITS = 12;

/** the radius (in M) the view should fit */
export function extentFor(o: Orbit, newton: boolean): number {
  if (o.stable) return o.ra;
  return newton ? o.ra : Math.max(o.rp, 6) * 1.25;
}

export type Frame = {
  o: Orbit;
  /** coordinate time since release at periapsis */
  t: number;
  /** pixels per M */
  scale: number;
  newton: boolean;
  /** 0..1, used to fade the trail out before a plunge restarts */
  fade: number;
};

export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, f: Frame) {
  const { o, t, scale: s, newton, fade } = f;
  const cx = W / 2;
  const cy = H / 2;
  const X = (r: number, phi: number) => cx + r * Math.cos(phi) * s;
  const Y = (r: number, phi: number) => cy - r * Math.sin(phi) * s;

  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, W, H);

  // the innermost stable circular orbit, r = 6M, as a dotted reference
  ctx.save();
  ctx.setLineDash([1, 4]);
  ctx.strokeStyle = 'rgba(88,85,78,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // the hole: a soft warm glow just outside the shadow, a thin photon ring, the shadow itself, the horizon inside
  const R = SHADOW * s;
  const glow = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.9 + 6);
  glow.addColorStop(0, rgba(PHOS, 0.22));
  glow.addColorStop(0.25, rgba(PHOS, 0.06));
  glow.addColorStop(1, rgba(PHOS, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.9 + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(PHOS, 0.85);
  ctx.lineWidth = Math.max(0.8, Math.min(1.4, R * 0.06));
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  if (HORIZON * s > 3) {
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(141,136,124,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, HORIZON * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Newton's ellipse with the same p and e: it closes on itself, no precession
  if (newton) {
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(ICE, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const ph = (i / 360) * Math.PI * 2;
      const r = o.p / (1 + o.e * Math.cos(ph));
      if (i === 0) ctx.moveTo(X(r, ph), Y(r, ph));
      else ctx.lineTo(X(r, ph), Y(r, ph));
    }
    ctx.stroke();
    ctx.restore();
  }

  const now = atTime(o, t);

  // the accumulated rosette: each past radial orbit drawn fainter with age
  ctx.lineWidth = 1;
  if (o.stable) {
    const k = Math.floor(now.phi / o.phiR);
    const per = 420;
    for (let j = Math.max(0, k - ROSETTE_ORBITS); j <= k; j++) {
      const a0 = j * o.phiR;
      const a1 = Math.min((j + 1) * o.phiR, now.phi);
      if (a1 <= a0) continue;
      const age = k - j;
      ctx.strokeStyle = rgba(BONE, (0.05 + 0.15 * (1 - age / (ROSETTE_ORBITS + 1))) * fade);
      ctx.beginPath();
      const steps = Math.max(2, Math.ceil(((a1 - a0) / o.phiR) * per));
      for (let i = 0; i <= steps; i++) {
        const ph = a0 + ((a1 - a0) * i) / steps;
        const r = atPhi(o, ph);
        if (i === 0) ctx.moveTo(X(r, ph), Y(r, ph));
        else ctx.lineTo(X(r, ph), Y(r, ph));
      }
      ctx.stroke();
      // a small mark where each periapsis landed
      if (j > 0) {
        ctx.fillStyle = rgba(PHOS, 0.55 * fade * (1 - age / (ROSETTE_ORBITS + 1)));
        ctx.beginPath();
        ctx.arc(X(o.rp, a0), Y(o.rp, a0), 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.strokeStyle = rgba(BONE, 0.16 * fade);
    ctx.beginPath();
    const steps = 600;
    for (let i = 0; i <= steps; i++) {
      const ph = (now.phi * i) / steps;
      const r = atPhi(o, ph);
      if (i === 0) ctx.moveTo(X(r, ph), Y(r, ph));
      else ctx.lineTo(X(r, ph), Y(r, ph));
    }
    ctx.stroke();
  }

  // the first periapsis direction, for reading the advance by eye
  ctx.strokeStyle = 'rgba(88,85,78,0.6)';
  ctx.beginPath();
  ctx.moveTo(X(R / s + 1, 0), Y(0, 0));
  ctx.lineTo(X(o.rp * 0.92, 0), Y(0, 0));
  ctx.stroke();

  // comet trail over the last stretch of coordinate time: long where it whips through periapsis, short at apoapsis
  const span = o.stable ? 0.16 * o.Tr : 0.12 * o.Tr;
  const N = 56;
  let px = 0;
  let py = 0;
  for (let i = 0; i <= N; i++) {
    const tt = t - span + (span * i) / N;
    if (tt < 0) continue;
    const q = atTime(o, tt);
    const x = X(q.r, q.phi);
    const y = Y(q.r, q.phi);
    if (i > 0 && tt - span / N >= 0) {
      const a = i / N;
      ctx.strokeStyle = rgba(PHOS, a * a * 0.9 * fade);
      ctx.lineWidth = 0.6 + a * 1.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    px = x;
    py = y;
  }

  // the particle; on a plunge it dims with the redshift factor sqrt(1 - 2M/r)
  const dim = o.stable ? 1 : Math.max(0.12, Math.min(1, 1.6 * Math.sqrt(Math.max(0, 1 - 2 / now.r))));
  const x = X(now.r, now.phi);
  const y = Y(now.r, now.phi);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 9);
  halo.addColorStop(0, rgba(PHOS, 0.5 * dim * fade));
  halo.addColorStop(1, rgba(PHOS, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba([246, 238, 222], dim * fade);
  ctx.beginPath();
  ctx.arc(x, y, 2.1, 0, Math.PI * 2);
  ctx.fill();
}
