// Browser inference for the trained TD3 actor (DRL4MM agent/networks.py Actor):
// Linear -> ReLU -> Linear -> ReLU -> Linear -> Tanh, scaled by max_action, applied to the
// env's 52-feature observation after the fixed normalization the policy was trained with.
// The actor's u in [-1, 1]^2 sets each side's distance from mid: d = half_max * (u + 1) / 2.

export interface ActorFile {
  max_action: number;
  hidden_dims: number[];
  normalizer: { mean: number[]; std: number[]; clip: number; far_ticks: number; tick: number };
  action_map: { half_max: number };
  layers: { in: number; out: number; w: ArrayLike<number>; b: ArrayLike<number> }[]; // w row-major [out][in]
}

/** The JSON holds float32 values as shortest decimals; restore the exact float32 weights. */
export function prepareActor(file: ActorFile): ActorFile {
  return { ...file, layers: file.layers.map((L) => ({ ...L, w: Float32Array.from(L.w), b: Float32Array.from(L.b) })) };
}

// observation layout of MarketMakingEnv._get_observation
const I_MID = 40;
const I_SPREAD = 41;
const I_POSV = 46;

/** features(): prices as ticks from mid (missing level = +-far), sizes as log1p, mid dropped. */
export function normalize(raw: Float32Array, n: ActorFile['normalizer']): Float32Array {
  const x = Array.from(raw);
  const f = x.slice();
  const mid = x[I_MID];
  for (let i = 0; i < 40; i += 2) {
    const sign = i < 20 ? -1 : 1;
    f[i] = x[i] > 0 ? Math.min(n.far_ticks, Math.max(-n.far_ticks, (x[i] - mid) / n.tick)) : sign * n.far_ticks;
    f[i + 1] = Math.log1p(x[i + 1]);
  }
  f[I_MID] = 0;
  f[I_SPREAD] = x[I_SPREAD] / n.tick;
  f[I_POSV] = mid > 0 ? x[I_POSV] / mid : 0;
  const z = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) z[i] = Math.min(n.clip, Math.max(-n.clip, (f[i] - n.mean[i]) / n.std[i]));
  return z;
}

/** actor(state) -> u: float32 weights, float64 accumulation, output rounded to float32 like torch. */
export function actorForward(file: ActorFile, raw: Float32Array): [number, number] {
  let h: ArrayLike<number> = normalize(raw, file.normalizer);
  file.layers.forEach((L, k) => {
    const last = k === file.layers.length - 1;
    const out = new Float64Array(L.out);
    for (let o = 0; o < L.out; o++) {
      let s = L.b[o];
      const row = o * L.in;
      for (let i = 0; i < L.in; i++) s += L.w[row + i] * h[i];
      out[o] = last ? Math.tanh(s) * file.max_action : Math.max(0, s);
    }
    h = out;
  });
  return [Math.fround(h[0]), Math.fround(h[1])];
}

/** The env action [bid offset, ask offset] (fractions of mid, float32) the trained policy sends. */
export function act(file: ActorFile, raw: Float32Array): [number, number] {
  const [u0, u1] = actorForward(file, raw);
  const half = file.action_map.half_max;
  return [Math.fround(-((half * (u0 + 1)) / 2)), Math.fround((half * (u1 + 1)) / 2)];
}

/** The repo's replay policy: fixed-midpoint-quotes, action = float32([-bps/1e4, +bps/1e4]). */
export function fixedQuotes(quoteBps: number): [number, number] {
  return [Math.fround(-quoteBps / 10000), Math.fround(quoteBps / 10000)];
}
