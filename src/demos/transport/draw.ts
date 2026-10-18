import type { Data, Scene } from './scene';

const VOID = '#0b0b0a';
const PHOS = [232, 169, 106] as const;
const BONE = [220, 214, 200] as const;
const ICE = [196, 204, 222] as const;
const RED = [236, 92, 82] as const;
const DIM = [141, 136, 124] as const;
const FAINT = [88, 85, 78] as const;
const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const FONT = (px: number) => `${px}px "IBM Plex Mono", ui-monospace, monospace`;

/** seconds on the loop; the story plays once, holds, fades, and starts over */
export const TL = {
  attempt: 0,
  critique: 1.8,
  edit: 3.4,
  transport: 5.0,
  signal: 10.2,
  settled: 11.6,
  fade: 19,
  end: 20,
} as const;
export const PHASES = ['attempt', 'critique', 'edit', 'transport', 'signal'] as const;

export function phaseAt(t: number): number {
  if (t < TL.critique) return 0;
  if (t < TL.edit) return 1;
  if (t < TL.transport) return 2;
  if (t < TL.signal) return 3;
  return 4;
}

/** which recorded Sinkhorn iterate to show: log-paced, so the first few updates are slow enough to see */
export function iterAt(t: number, K: number): number {
  if (t < TL.transport) return 0;
  const s = clamp01((t - TL.transport) / (TL.signal - TL.transport - 0.6));
  return Math.min(K, Math.round(Math.pow(K + 1, s) - 1));
}

export type Frame = {
  t: number;
  data: Data;
  scene: Scene;
  /** the plan at the shown iterate */
  P: Float64Array;
};

function fit(W: number, H: number, v: Data['view']) {
  const pad = 16;
  const s = Math.min((W - 2 * pad) / (v.x1 - v.x0), (H - 2 * pad - 18) / (v.y1 - v.y0));
  const ox = (W - s * (v.x1 - v.x0)) / 2;
  const oy = (H - s * (v.y1 - v.y0)) / 2;
  return { s, X: (x: number) => ox + (x - v.x0) * s, Y: (y: number) => H - oy - (y - v.y0) * s };
}

function arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, head: number) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
  ctx.stroke();
}

/** energies scaled to [0, 1] over this trajectory */
export function energyLevels(E: number[]): number[] {
  const lo = Math.min(...E);
  const hi = Math.max(...E);
  return E.map((e) => (hi > lo ? (e - lo) / (hi - lo) : 0));
}

/** the factor that makes the largest edit about `px` pixels long */
export function editGain(data: Data, scale: number, px: number): number {
  let m = 0;
  for (const [dx, dy] of data.e2) m = Math.max(m, Math.hypot(dx, dy));
  return m > 0 ? px / (m * scale) : 0;
}

export function drawMain(ctx: CanvasRenderingContext2D, W: number, H: number, f: Frame) {
  const { t, data, scene, P } = f;
  const { traj, p2, e2 } = data;
  const T = traj.T;
  const { s, X, Y } = fit(W, H, data.view);
  const fade = t > TL.fade ? 1 - clamp01((t - TL.fade) / (TL.end - TL.fade)) : 1;
  const pA = clamp01((t - TL.attempt) / (TL.critique - TL.attempt - 0.2));
  const pC = ease((t - TL.critique) / 1.0);
  const pE = ease((t - TL.edit) / 1.3);
  const inTransport = t >= TL.transport;
  const pS = ease((t - TL.signal) / 1.2);
  const small = W < 480;
  const level = energyLevels(traj.energy);
  const changed = new Set(traj.changed);

  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;

  // the attempt's path through the projected states, drawn in as the steps arrive
  const shown = pA * (T - 1);
  ctx.strokeStyle = rgba(FAINT, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < T; i++) {
    if (i > shown + 1) break;
    let [x, y] = p2[i];
    if (i > shown) {
      const k = shown - (i - 1);
      x = p2[i - 1][0] + (x - p2[i - 1][0]) * k;
      y = p2[i - 1][1] + (y - p2[i - 1][1]) * k;
    }
    if (i === 0) ctx.moveTo(X(x), Y(y));
    else ctx.lineTo(X(x), Y(y));
  }
  ctx.stroke();

  // the transport plan: hairlines from each step of the attempt to the target steps it is sent to
  if (inTransport) {
    const m = P.reduce((a, b) => a + b, 0) || 1;
    ctx.lineWidth = 1;
    for (let i = 0; i < T; i++) {
      for (let j = 0; j < T; j++) {
        const w = (P[i * T + j] * T) / m;
        if (w < 0.015) continue;
        const a = 0.85 * Math.pow(Math.min(1, w), 0.75);
        const x0 = X(p2[i][0]);
        const y0 = Y(p2[i][1]);
        const x1 = X(p2[j][0] + e2[j][0]);
        const y1 = Y(p2[j][1] + e2[j][1]);
        if (Math.hypot(x1 - x0, y1 - y0) < 2.5) {
          // mass that stays with its own step: a soft halo instead of a zero-length line
          ctx.fillStyle = rgba(PHOS, 0.3 * a);
          ctx.beginPath();
          ctx.arc(x0, y0, 5, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.strokeStyle = rgba(PHOS, a);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
  }

  // the edit R* - R, magnified so it can be seen at all
  if (pE > 0) {
    const gain = editGain(data, s, small ? 16 : 22);
    ctx.strokeStyle = rgba(ICE, 0.85 * (inTransport ? 0.5 : 1));
    ctx.lineWidth = 1;
    for (let i = 0; i < T; i++) {
      const x0 = X(p2[i][0]);
      const y0 = Y(p2[i][1]);
      const x1 = x0 + e2[i][0] * s * gain * pE;
      const y1 = y0 - e2[i][1] * s * gain * pE;
      if (Math.hypot(x1 - x0, y1 - y0) > 3) arrow(ctx, x0, y0, x1, y1, 3);
    }
  }

  // the steps: prompt bytes small and dim, attempt bytes bone; the critic's energy as a red halo
  for (let i = 0; i < T; i++) {
    if (i > shown + 0.001) break;
    const x = X(p2[i][0]);
    const y = Y(p2[i][1]);
    const att = traj.seg[i] === 'y';
    if (pC > 0) {
      const l = level[i];
      ctx.fillStyle = rgba(RED, 0.5 * pC * l * l);
      ctx.beginPath();
      ctx.arc(x, y, 3 + 6 * l, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = att ? rgba(BONE, 0.95) : rgba(DIM, 0.75);
    ctx.beginPath();
    ctx.arc(x, y, att ? 2.6 : 1.7, 0, Math.PI * 2);
    ctx.fill();
    if (changed.has(i) && pC > 0) {
      ctx.strokeStyle = rgba(RED, 0.9 * pC);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // byte labels on the attempt's steps
  ctx.font = FONT(small ? 9 : 10);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (let i = 0; i < T; i++) {
    if (i > shown + 0.001) break;
    if (traj.seg[i] !== 'y' && i !== 0) continue;
    const lab = i === 0 ? 'bos' : traj.labels[i] === ' ' ? '␣' : traj.labels[i];
    const hot = changed.has(i) && pC > 0;
    ctx.fillStyle = hot ? rgba(RED, 0.95) : rgba(DIM, 0.8);
    ctx.fillText(lab, X(p2[i][0]) + 9, Y(p2[i][1]) - 9);
  }

  // the pull of the alignment term on each step of the attempt, normalized to the largest
  if (pS > 0) {
    const gmax = Math.max(...scene.signal) || 1;
    const L = (small ? 30 : 42) * pS;
    ctx.strokeStyle = rgba(PHOS, 1);
    ctx.lineWidth = 1.25;
    for (let i = 0; i < T; i++) {
      const g = scene.signal[i];
      const len = (g / gmax) * L;
      const [px, py] = scene.pull[i];
      const n = Math.hypot(px, py);
      if (len < 3 || n === 0) continue;
      const x0 = X(p2[i][0]);
      const y0 = Y(p2[i][1]);
      arrow(ctx, x0, y0, x0 + (px / n) * len, y0 - (py / n) * len, 4);
    }
  }
  ctx.globalAlpha = 1;
}

let matrixCanvas: HTMLCanvasElement | null = null;

/** per-step bars on the left (critic energy, then the alignment pull), the plan matrix on the right */
export function drawStrip(ctx: CanvasRenderingContext2D, W: number, H: number, f: Frame) {
  const { t, data, scene, P } = f;
  const T = data.traj.T;
  const fade = t > TL.fade ? 1 - clamp01((t - TL.fade) / (TL.end - TL.fade)) : 1;
  const pC = ease((t - TL.critique) / 1.0);
  const pS = ease((t - TL.signal) / 1.2);
  const changed = new Set(data.traj.changed);
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;

  // matrix: one pixel per entry, scaled up without smoothing
  const mSize = Math.max(T, Math.floor(Math.min(H - 22, W < 480 ? 86 : 112) / T) * T);
  const mx = W - mSize - 1;
  const my = 4;
  ctx.strokeStyle = rgba(FAINT, 0.9);
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 0.5, my - 0.5, mSize + 1, mSize + 1);
  if (t >= TL.transport && typeof document !== 'undefined') {
    matrixCanvas ??= document.createElement('canvas');
    const mc = matrixCanvas;
    if (mc.width !== T) {
      mc.width = T;
      mc.height = T;
    }
    const mctx = mc.getContext('2d');
    if (mctx) {
      const img = mctx.createImageData(T, T);
      const m = P.reduce((a, b) => a + b, 0) || 1;
      for (let k = 0; k < T * T; k++) {
        const w = Math.min(1, (P[k] * T) / m);
        const a = w < 0.004 ? 0 : 0.12 + 0.88 * Math.pow(w, 0.6);
        img.data[k * 4] = PHOS[0];
        img.data[k * 4 + 1] = PHOS[1];
        img.data[k * 4 + 2] = PHOS[2];
        img.data[k * 4 + 3] = Math.round(255 * a);
      }
      mctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mc, mx, my, mSize, mSize);
      ctx.imageSmoothingEnabled = true;
    }
  }
  const cell = mSize / T;
  for (const i of data.traj.changed) {
    ctx.fillStyle = rgba(RED, 0.85);
    ctx.fillRect(mx - 5, my + i * cell, 3, Math.max(1, cell));
  }
  ctx.fillStyle = rgba(DIM, 0.9);
  ctx.font = FONT(9);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('target step →', mx + mSize / 2, my + mSize + 6);

  // bars
  const left = 0;
  const right = mx - 22;
  const base = H - 16;
  const top = 8;
  const bw = (right - left) / T;
  ctx.strokeStyle = rgba(FAINT, 0.9);
  ctx.beginPath();
  ctx.moveTo(left, base + 0.5);
  ctx.lineTo(right, base + 0.5);
  ctx.stroke();
  // the prompt / attempt boundary
  const yStart = data.traj.seg.indexOf('y');
  if (yStart > 0) {
    ctx.fillStyle = rgba(FAINT, 1);
    ctx.font = FONT(9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('x', left, base + 4);
    ctx.fillText('y0', left + yStart * bw, base + 4);
    ctx.fillRect(Math.round(left + yStart * bw) - 0.5, top, 1, base - top);
  }
  const showSignal = pS > 0;
  const vals = showSignal ? scene.signal : energyLevels(data.traj.energy);
  const amp = showSignal ? pS : pC;
  const total = scene.signal.reduce((a, b) => a + b, 0) || 1;
  const gmax = showSignal ? Math.max(...scene.signal, total / T) || 1 : 1;
  for (let i = 0; i < T; i++) {
    const h = (vals[i] / gmax) * (base - top) * amp;
    const hot = changed.has(i);
    ctx.fillStyle = showSignal ? (hot ? rgba(PHOS, 0.95) : rgba(DIM, 0.85)) : hot ? rgba(RED, 0.95) : rgba(RED, 0.45);
    const x = left + i * bw + bw * 0.15;
    ctx.fillRect(x, base - h, Math.max(1, bw * 0.7), h);
  }
  // outcome-only GRPO: one advantage, the same on every step
  if (showSignal) {
    const yU = base - (total / T / gmax) * (base - top) * pS;
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = rgba(ICE, 0.8);
    ctx.beginPath();
    ctx.moveTo(left, Math.round(yU) + 0.5);
    ctx.lineTo(right, Math.round(yU) + 0.5);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
