/**
 * Perspective rendering of the dipole scene, in Earth radii: hairline field
 * lines, a dark Earth with its graticule, and luminous fading trails drawn
 * additively into a layer that is also blurred for glow.
 */
import { TRAIL_CAP, type Belt } from './belt.ts';

export type Camera = { az: number; el: number };

const D = 26; // camera distance, Earth radii
const FIELD_L = [2, 3, 4, 5];
const FIELD_LON = 12;

type Proj = { cx: number; cy: number; f: number; ca: number; sa: number; ce: number; se: number };

function makeProj(w: number, h: number, cam: Camera): Proj {
  // frame the belt (L 2.5 to 3.5); the outer field lines run off the edge
  const half = Math.min(w * 0.5, h * 0.5);
  const unit = half / (w > h * 1.2 ? 3.7 : 4.1);
  return { cx: w / 2, cy: h / 2 + h * 0.02, f: unit * D, ca: Math.cos(cam.az), sa: Math.sin(cam.az), ce: Math.cos(cam.el), se: Math.sin(cam.el) };
}

/** project world (x, y, z) Re: writes screen x, y, depth offset and an occlusion flag into out */
function project(p: Proj, x: number, y: number, z: number, out: Float64Array) {
  const xr = x * p.ca + y * p.sa;
  const yr = -x * p.sa + y * p.ca;
  const up = yr * p.se + z * p.ce;
  const dz = yr * p.ce - z * p.se;
  const depth = D + dz;
  out[0] = p.cx + (p.f * xr) / depth;
  out[1] = p.cy - (p.f * up) / depth;
  out[2] = dz;
  // is the Earth (unit sphere) between the camera at (0, 0, -D) and the point?
  const ax = xr;
  const ay = up;
  const az = dz + D;
  const a = ax * ax + ay * ay + az * az;
  const b = -2 * D * az;
  const c = D * D - 1;
  const disc = b * b - 4 * a * c;
  let hidden = 0;
  if (disc > 0) {
    const t1 = (-b - Math.sqrt(disc)) / (2 * a);
    if (t1 > 0 && t1 < 1) hidden = 1;
  }
  out[3] = hidden;
}

const tmp = new Float64Array(4);
const px = new Float32Array(TRAIL_CAP + 1);
const py = new Float32Array(TRAIL_CAP + 1);
const pz = new Float32Array(TRAIL_CAP + 1);
const ph = new Uint8Array(TRAIL_CAP + 1);

type Star = { x: number; y: number; z: number; a: number };
let stars: Star[] | null = null;
function starfield(): Star[] {
  if (stars) return stars;
  let s = 7;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  stars = Array.from({ length: 140 }, () => {
    const u = 2 * r() - 1;
    const t = 2 * Math.PI * r();
    const k = Math.sqrt(1 - u * u);
    return { x: k * Math.cos(t), y: k * Math.sin(t), z: u, a: 0.08 + 0.32 * r() ** 3 };
  });
  return stars;
}

export function drawBelt(ctx: CanvasRenderingContext2D, lay: CanvasRenderingContext2D, w: number, h: number, belt: Belt, cam: Camera) {
  const p = makeProj(w, h, cam);

  // ---- background
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b0b0a';
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, Math.max(w, h) * 0.7);
  vg.addColorStop(0, 'rgba(26,25,23,0.55)');
  vg.addColorStop(1, 'rgba(11,11,10,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // stars at infinity turn with the camera
  for (const st of starfield()) {
    const xr = st.x * p.ca + st.y * p.sa;
    const yr = -st.x * p.sa + st.y * p.ca;
    const up = yr * p.se + st.z * p.ce;
    const dz = yr * p.ce - st.z * p.se;
    if (dz < 0.15) continue;
    const sx = p.cx + (xr / dz) * p.f * 0.09;
    const sy = p.cy - (up / dz) * p.f * 0.09;
    if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
    ctx.fillStyle = `rgba(196,204,222,${st.a})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // ---- field lines: hairlines, the far side fainter, hidden behind the planet
  ctx.lineWidth = 1;
  for (const L of FIELD_L) {
    const lamF = Math.acos(Math.sqrt(1 / L));
    const home = L === 3;
    for (let j = 0; j < FIELD_LON; j++) {
      const phi = (j / FIELD_LON) * Math.PI * 2;
      const cphi = Math.cos(phi);
      const sphi = Math.sin(phi);
      const N = 56;
      let prevVis = false;
      let back = 0;
      ctx.beginPath();
      for (let k = 0; k <= N; k++) {
        const lam = -lamF + (2 * lamF * k) / N;
        const c = Math.cos(lam);
        const r = L * c * c;
        project(p, r * c * cphi, r * c * sphi, r * Math.sin(lam), tmp);
        const vis = tmp[3] === 0;
        back += tmp[2];
        if (vis && prevVis) ctx.lineTo(tmp[0], tmp[1]);
        else if (vis) ctx.moveTo(tmp[0], tmp[1]);
        prevVis = vis;
      }
      const far = back / (N + 1) > 0;
      const a = (home ? 0.2 : 0.11) * (far ? 0.5 : 1);
      ctx.strokeStyle = `rgba(220,214,200,${a})`;
      ctx.stroke();
    }
  }

  // ---- the planet
  const rE = p.f / Math.sqrt(D * D - 1);
  // a thin limb of atmosphere
  const at = ctx.createRadialGradient(p.cx, p.cy, rE * 0.98, p.cx, p.cy, rE * 1.22);
  at.addColorStop(0, 'rgba(196,204,222,0.16)');
  at.addColorStop(1, 'rgba(196,204,222,0)');
  ctx.fillStyle = at;
  ctx.beginPath();
  ctx.arc(p.cx, p.cy, rE * 1.22, 0, Math.PI * 2);
  ctx.fill();
  // body, faintly lit from a fixed sun direction in world space (+x)
  project(p, 6, 0, 0, tmp);
  const lx = tmp[0] - p.cx;
  const ly = tmp[1] - p.cy;
  const ll = Math.hypot(lx, ly) || 1;
  const lit = Math.min(1, ll / (rE * 3));
  const body = ctx.createRadialGradient(p.cx + (lx / ll) * rE * 0.45 * lit, p.cy + (ly / ll) * rE * 0.45 * lit, rE * 0.05, p.cx, p.cy, rE);
  body.addColorStop(0, '#22211e');
  body.addColorStop(0.6, '#141412');
  body.addColorStop(1, '#0d0d0c');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(p.cx, p.cy, rE, 0, Math.PI * 2);
  ctx.fill();
  // graticule on the near hemisphere
  ctx.strokeStyle = 'rgba(196,204,222,0.13)';
  ctx.beginPath();
  const onNear = (x: number, y: number, z: number) => {
    project(p, x, y, z, tmp);
    return tmp[2] < -1 / D;
  };
  for (const latDeg of [-60, -30, 0, 30, 60]) {
    const lat = (latDeg * Math.PI) / 180;
    let pen = false;
    for (let k = 0; k <= 72; k++) {
      const lo = (k / 72) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lo);
      const y = Math.cos(lat) * Math.sin(lo);
      const z = Math.sin(lat);
      const near = onNear(x, y, z);
      if (near && pen) ctx.lineTo(tmp[0], tmp[1]);
      else if (near) ctx.moveTo(tmp[0], tmp[1]);
      pen = near;
    }
  }
  for (let m = 0; m < 12; m++) {
    const lo = (m / 12) * Math.PI * 2;
    let pen = false;
    for (let k = 0; k <= 36; k++) {
      const lat = -Math.PI / 2 + (k / 36) * Math.PI;
      const x = Math.cos(lat) * Math.cos(lo);
      const y = Math.cos(lat) * Math.sin(lo);
      const z = Math.sin(lat);
      const near = onNear(x, y, z);
      if (near && pen) ctx.lineTo(tmp[0], tmp[1]);
      else if (near) ctx.moveTo(tmp[0], tmp[1]);
      pen = near;
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(196,204,222,0.32)';
  ctx.beginPath();
  ctx.arc(p.cx, p.cy, rE, 0, Math.PI * 2);
  ctx.stroke();
  // dipole axis stubs out of the poles
  ctx.strokeStyle = 'rgba(220,214,200,0.28)';
  ctx.beginPath();
  for (const sgn of [1, -1]) {
    project(p, 0, 0, sgn * 1.02, tmp);
    if (tmp[3]) continue;
    ctx.moveTo(tmp[0], tmp[1]);
    project(p, 0, 0, sgn * 1.45, tmp);
    ctx.lineTo(tmp[0], tmp[1]);
  }
  ctx.stroke();

  // ---- luminous layer: trails, heads, auroral flashes
  lay.globalCompositeOperation = 'source-over';
  lay.clearRect(0, 0, w, h);
  lay.globalCompositeOperation = 'lighter';
  lay.lineCap = 'round';
  lay.lineJoin = 'round';
  const rgb = belt.p.species === 'p' ? '232,169,106' : '196,204,222';
  const BANDS = 9;
  // fast bouncers retrace their field line many times within one trail; thin them so they do not burn out
  const dens = Math.min(1, Math.max(0.26, belt.th.bounce / belt.rate / 2.4));
  for (let i = 0; i < belt.n; i++) {
    const len = belt.len[i];
    if (len < 2) continue;
    const start = (belt.head[i] - len + TRAIL_CAP) % TRAIL_CAP;
    const base = i * TRAIL_CAP;
    for (let k = 0; k < len; k++) {
      const j = 3 * (base + ((start + k) % TRAIL_CAP));
      project(p, belt.trail[j], belt.trail[j + 1], belt.trail[j + 2], tmp);
      px[k] = tmp[0];
      py[k] = tmp[1];
      pz[k] = tmp[2];
      ph[k] = tmp[3];
    }
    // older segments fainter; nearer ones a touch brighter
    const per = Math.ceil(len / BANDS);
    for (let b = 0; b < BANDS; b++) {
      const k0 = b * per;
      if (k0 >= len - 1) break;
      const k1 = Math.min(len - 1, k0 + per);
      const age = (b + 1) / BANDS;
      const depth = pz[(k0 + k1) >> 1];
      const near = Math.min(1.25, Math.max(0.55, 1 - depth / 9));
      const a = 0.62 * age ** 1.7 * near * dens;
      lay.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
      lay.lineWidth = 0.9 + 0.5 * age;
      lay.beginPath();
      let pen = false;
      for (let k = k0; k <= k1; k++) {
        if (ph[k]) {
          pen = false;
          continue;
        }
        if (pen) lay.lineTo(px[k], py[k]);
        else lay.moveTo(px[k], py[k]);
        pen = true;
      }
      lay.stroke();
    }
    const last = len - 1;
    if (!ph[last]) {
      lay.fillStyle = 'rgba(244,236,220,0.9)';
      lay.beginPath();
      lay.arc(px[last], py[last], 1.5, 0, Math.PI * 2);
      lay.fill();
    }
  }
  for (const fl of belt.flashes) {
    project(p, fl.x, fl.y, fl.z, tmp);
    if (tmp[3] && tmp[2] > 0) continue;
    const k = fl.age / 2.2;
    const rad = 3 + 16 * Math.sqrt(k);
    const g = lay.createRadialGradient(tmp[0], tmp[1], 0, tmp[0], tmp[1], rad);
    g.addColorStop(0, `rgba(236,92,82,${(0.85 * (1 - k)).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(232,169,106,${(0.25 * (1 - k)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(236,92,82,0)');
    lay.fillStyle = g;
    lay.beginPath();
    lay.arc(tmp[0], tmp[1], rad, 0, Math.PI * 2);
    lay.fill();
  }

  return { earthPx: rE, unitPx: p.f / D };
}
