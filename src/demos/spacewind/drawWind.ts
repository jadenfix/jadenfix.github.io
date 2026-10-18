/**
 * Top-down ecliptic view of the Parker wind: radial parcels, the spiral field
 * they drag out, the sonic point, and the sail craft's integrated track.
 */
import { AU, SOLAR_RADIUS, type SpeedTable, type Track, type WindModel } from './parker.ts';

export const VIEW_AU = 1.62;
/** simulated days per wall-clock second: a solar rotation in about 21 s */
export const DAYS_PER_S = 1.2;
export const LINES = 12;
const R_OUT = 1.75 * AU;

export type Parcels = { r: Float64Array; phi: Float64Array };

let seed = 11;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** a steady-state pool: uniform in travel time, so the density thins as the wind speeds up */
export function makeParcels(table: SpeedTable, n: number): Parcels {
  const r = new Float64Array(n);
  const phi = new Float64Array(n);
  const tMax = table.tau[table.n - 1];
  for (let i = 0; i < n; i++) {
    let ri = R_OUT;
    for (let k = 0; k < 4 && ri >= R_OUT; k++) ri = table.radiusAfter(rnd() * tMax);
    r[i] = Math.min(ri, R_OUT * 0.999);
    phi[i] = rnd() * Math.PI * 2;
  }
  return { r, phi };
}

export function advanceParcels(p: Parcels, table: SpeedTable, dtSim: number) {
  const { r, phi } = p;
  for (let i = 0; i < r.length; i++) {
    r[i] += table.speed(r[i]) * dtSim;
    if (r[i] > R_OUT) {
      r[i] = table.r0;
      phi[i] = rnd() * Math.PI * 2;
    }
  }
}

const COLOR_BUCKETS = 6;
const ALPHA_BUCKETS = 5;
const buckets: Path2D[][] = [];

/** ice for the slow inner wind, amber where it has accelerated */
function speedColor(f: number) {
  const a = [196, 204, 222];
  const b = [232, 169, 106];
  return a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',');
}

export type CraftView = { track: Track; k: number; normal: [number, number]; force: [number, number]; on: boolean; label: string };

export function drawWind(
  ctx: CanvasRenderingContext2D,
  lay: CanvasRenderingContext2D,
  w: number,
  h: number,
  model: WindModel,
  table: SpeedTable,
  parcels: Parcels,
  tWind: number,
  craft: CraftView,
) {
  const cx = w / 2;
  const cy = h / 2;
  const s = (Math.min(w, h) / 2 - 6) / (VIEW_AU * AU); // px per metre
  const X = (r: number, ph: number) => cx + r * s * Math.cos(ph);
  const Y = (r: number, ph: number) => cy - r * s * Math.sin(ph);

  // ---- ground
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b0b0a';
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
  vg.addColorStop(0, 'rgba(26,25,23,0.6)');
  vg.addColorStop(1, 'rgba(11,11,10,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // range rings and bearing ticks
  ctx.lineWidth = 1;
  for (const au of [0.5, 1, 1.5]) {
    ctx.strokeStyle = au === 1 ? 'rgba(220,214,200,0.16)' : 'rgba(220,214,200,0.07)';
    ctx.beginPath();
    ctx.arc(cx, cy, au * AU * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(220,214,200,0.12)';
  ctx.beginPath();
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const r0 = 1.5 * AU * s;
    const len = k % 6 === 0 ? 7 : 3;
    ctx.moveTo(cx + r0 * Math.cos(a), cy - r0 * Math.sin(a));
    ctx.lineTo(cx + (r0 + len) * Math.cos(a), cy - (r0 + len) * Math.sin(a));
  }
  ctx.stroke();
  ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(141,136,124,0.75)';
  ctx.textBaseline = 'middle';
  for (const au of [0.5, 1, 1.5]) {
    const a = (-38 * Math.PI) / 180;
    ctx.fillText(`${au} au`, cx + au * AU * s * Math.cos(a) + 4, cy - au * AU * s * Math.sin(a) + 6);
  }

  // sonic point, where the wind goes supersonic
  const rc = model.centralMu / (2 * ((1.380649e-23 * (model.protonT + model.electronT)) / 1.67262192369e-27));
  const rcPx = Math.max(3, rc * s);
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(196,204,222,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy, rcPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (w >= 520) {
    const a = (140 * Math.PI) / 180;
    const x0 = cx + rcPx * Math.cos(a);
    const y0 = cy - rcPx * Math.sin(a);
    const x1 = x0 - 26;
    const y1 = y0 - 26;
    ctx.strokeStyle = 'rgba(141,136,124,0.4)';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 - 8, y1);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(`sonic point ${(rc / SOLAR_RADIUS).toFixed(1)} r_sun`, x1 - 11, y1);
    ctx.textAlign = 'left';
  }

  // ---- spiral field lines (main) and a whisper of them in the glow
  const rot = model.omega * tWind;
  lay.globalCompositeOperation = 'source-over';
  lay.clearRect(0, 0, w, h);
  lay.globalCompositeOperation = 'lighter';
  const linePath = new Path2D();
  for (let j = 0; j < LINES; j++) {
    const ph0 = (j / LINES) * Math.PI * 2 + rot;
    let first = true;
    for (let i = 0; i < table.n; i += 4) {
      const r = table.radius(i);
      if (r > R_OUT) break;
      const ph = ph0 + table.lag[i];
      if (first) linePath.moveTo(X(r, ph), Y(r, ph));
      else linePath.lineTo(X(r, ph), Y(r, ph));
      first = false;
    }
  }
  ctx.strokeStyle = 'rgba(196,204,222,0.26)';
  ctx.lineWidth = 1;
  ctx.stroke(linePath);
  lay.strokeStyle = 'rgba(196,204,222,0.07)';
  lay.lineWidth = 1.5;
  lay.stroke(linePath);

  // ---- wind parcels: short radial streaks, brighter when they sit on a drawn field line
  for (let c = 0; c < COLOR_BUCKETS; c++) {
    buckets[c] = [];
    for (let a = 0; a < ALPHA_BUCKETS; a++) buckets[c][a] = new Path2D();
  }
  const vTop = table.speed(R_OUT);
  const spacing = (Math.PI * 2) / LINES;
  const streakS = 0.32 * 86400 * DAYS_PER_S; // the distance covered in about a third of a second on screen
  const { r, phi } = parcels;
  for (let i = 0; i < r.length; i++) {
    const ri = r[i];
    const v = table.speed(ri);
    // footpoint longitude this parcel's field line is anchored at, relative to the drawn lines
    let d = (phi[i] - rot - table.phase(ri)) % spacing;
    if (d < 0) d += spacing;
    d = Math.min(d, spacing - d);
    const on = Math.exp(-((d / 0.065) ** 2));
    const edge = Math.min(1, (R_OUT - ri) / (0.25 * AU)) * Math.min(1, (ri * s) / 10);
    const alpha = (0.06 + 0.94 * on) * edge;
    const ab = Math.min(ALPHA_BUCKETS - 1, Math.floor(alpha * ALPHA_BUCKETS));
    if (alpha < 0.02) continue;
    const cb = Math.min(COLOR_BUCKETS - 1, Math.floor((v / vTop) ** 1.5 * COLOR_BUCKETS));
    const r0 = Math.max(table.r0, ri - v * streakS);
    const path = buckets[cb][ab];
    path.moveTo(X(r0, phi[i]), Y(r0, phi[i]));
    path.lineTo(X(ri, phi[i]), Y(ri, phi[i]));
  }
  lay.lineCap = 'round';
  lay.lineWidth = 1.3;
  for (let c = 0; c < COLOR_BUCKETS; c++) {
    const col = speedColor((c + 0.5) / COLOR_BUCKETS);
    for (let a = 0; a < ALPHA_BUCKETS; a++) {
      lay.strokeStyle = `rgba(${col},${(0.04 + (0.86 * (a + 1)) / ALPHA_BUCKETS).toFixed(3)})`;
      lay.stroke(buckets[c][a]);
    }
  }

  // ---- the star
  const sun = lay.createRadialGradient(cx, cy, 0, cx, cy, 34);
  sun.addColorStop(0, 'rgba(255,240,215,1)');
  sun.addColorStop(0.08, 'rgba(244,200,140,0.9)');
  sun.addColorStop(0.35, 'rgba(232,169,106,0.22)');
  sun.addColorStop(1, 'rgba(232,169,106,0)');
  lay.fillStyle = sun;
  lay.beginPath();
  lay.arc(cx, cy, 34, 0, Math.PI * 2);
  lay.fill();

  // ---- the craft: predicted track dotted, flown track solid
  const { track, k } = craft;
  const toPx = (i: number): [number, number] => [cx + track.x[i] * s, cy - track.y[i] * s];
  const stride = 2;
  ctx.setLineDash([2, 4]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(232,169,106,0.55)';
  ctx.beginPath();
  for (let i = k; i < track.x.length; i += stride) {
    const [x, y] = toPx(i);
    if (i === k) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (k > 0) {
    lay.strokeStyle = 'rgba(232,169,106,0.75)';
    lay.lineWidth = 1.2;
    lay.beginPath();
    for (let i = 0; i <= k; i += stride) {
      const [x, y] = toPx(i);
      if (i === 0) lay.moveTo(x, y);
      else lay.lineTo(x, y);
    }
    const [xk, yk] = toPx(k);
    lay.lineTo(xk, yk);
    lay.stroke();
  }
  const [x, y] = toPx(k);
  // sail edge-on: a short bar normal to the sail normal
  const [nx, ny] = craft.normal;
  ctx.strokeStyle = 'rgba(220,214,200,0.95)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - ny * 7, y - nx * 7);
  ctx.lineTo(x + ny * 7, y + nx * 7);
  ctx.stroke();
  ctx.lineWidth = 1;
  if (craft.on) {
    const fl = Math.hypot(craft.force[0], craft.force[1]) || 1;
    const fx = craft.force[0] / fl;
    const fy = -craft.force[1] / fl;
    lay.strokeStyle = 'rgba(232,169,106,0.85)';
    lay.beginPath();
    lay.moveTo(x + fx * 5, y + fy * 5);
    lay.lineTo(x + fx * 22, y + fy * 22);
    lay.moveTo(x + fx * 22, y + fy * 22);
    lay.lineTo(x + fx * 18 - fy * 3, y + fy * 18 + fx * 3);
    lay.moveTo(x + fx * 22, y + fy * 22);
    lay.lineTo(x + fx * 18 + fy * 3, y + fy * 18 - fx * 3);
    lay.stroke();
  }
  ctx.strokeStyle = 'rgba(232,169,106,0.7)';
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  const halo = lay.createRadialGradient(x, y, 0, x, y, 9);
  halo.addColorStop(0, 'rgba(244,236,220,0.95)');
  halo.addColorStop(0.3, 'rgba(232,169,106,0.5)');
  halo.addColorStop(1, 'rgba(232,169,106,0)');
  lay.fillStyle = halo;
  lay.beginPath();
  lay.arc(x, y, 9, 0, Math.PI * 2);
  lay.fill();
  ctx.fillStyle = 'rgba(220,214,200,0.8)';
  ctx.textAlign = x > cx + 60 ? 'right' : 'left';
  ctx.fillText(craft.label, x + (x > cx + 60 ? -14 : 14), y + (y > cy ? 14 : -14));
  ctx.textAlign = 'left';
}
