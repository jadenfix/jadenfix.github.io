// Real traces, generated offline with the InftyThink repo's own code and replayed here.
//  - run_iterative_reasoning (src/inference/iterative_reasoner.py), summary_only: for t in 1..T a
//    segment of at most K tokens, then a summary of at most S; then a final answer of at most 128
//    tokens from [question, summaries]. Each step's prompt is rebuilt, so the context is that prompt
//    plus whatever the step has generated so far.
//  - generate_vanilla_cot (src/inference/vanilla_cot.py) at baseline B2's matched budget: one prompt,
//    every generated token stays in context, clipped to the last max_seq_len tokens.
// Every count below is an exact tokenizer count recorded during generation (public/data/infty).

export type Kind = 'question' | 'segment' | 'summary' | 'final' | 'cot';

export const FILL: Record<Kind, string> = {
  question: '#c4ccde',
  segment: '#8d887c',
  cot: '#8d887c',
  summary: '#e8a96a',
  final: '#dcd6c8',
};

export interface Step {
  k: 'segment' | 'summary' | 'final';
  t: number; // iteration, 1-based (final: last segment + 1)
  ctx: number; // prompt tokens fed to this step
  parts: [Kind, number][]; // that prompt, split into question / summaries / segment
  tok: string[]; // generated text, one entry per token
}

interface Run {
  answer: string;
  correct: boolean;
  total: number;
  peak: number;
  secs: number;
}

export interface Problem {
  id: number;
  q: string;
  qTok: number;
  gold: string;
  infty: Run & { steps: Step[] };
  cot: Run & { prompt: number; tok: string[] };
}

export interface Traces {
  model: string;
  dataset: string;
  device: string;
  cfg: { K: number; S: number; T: number; budget: number; cotBudget: number; maxSeq: number; finalLen: number; conditioning: string; temperature: number; topP: number };
  wallSecs: number;
  cpuSecs: number;
  problems: Problem[];
}

let cache: Promise<Traces> | null = null;
export function loadTraces(): Promise<Traces> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/infty/traces.json`).then((r) => {
    if (!r.ok) throw new Error(`traces ${r.status}`);
    return r.json() as Promise<Traces>;
  });
  return cache;
}

export interface Part {
  kind: Kind;
  len: number;
}

export const sumLen = (parts: Part[]) => parts.reduce((s, p) => s + p.len, 0);

/** generated-token offset where each step begins */
export function starts(steps: Step[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const st of steps) {
    out.push(s);
    s += st.tok.length;
  }
  return out;
}

export interface InftyState {
  i: number; // current step
  done: number; // tokens of that step generated so far
  finished: boolean;
  parts: Part[]; // attended context right now
}

/** InftyThink after g generated tokens */
export function inftyAt(steps: Step[], g: number): InftyState {
  const st = starts(steps);
  let i = 0;
  while (i < steps.length - 1 && g >= st[i + 1]) i++;
  const step = steps[i];
  const done = Math.max(0, Math.min(step.tok.length, g - st[i]));
  const live: Kind = step.k === 'final' ? 'final' : step.k;
  const parts: Part[] = step.parts.map(([kind, len]) => ({ kind, len }));
  if (done > 0) parts.push({ kind: live, len: done });
  return { i, done, finished: i === steps.length - 1 && done === step.tok.length, parts };
}

/** vanilla CoT after g generated tokens: prompt plus everything generated, clipped to maxSeq */
export function cotAt(prompt: number, total: number, g: number, maxSeq: number): { parts: Part[]; gen: number; dropped: number } {
  const gen = Math.max(0, Math.min(total, g));
  const dropped = Math.max(0, prompt + gen - maxSeq);
  return {
    gen,
    dropped,
    parts: [
      { kind: 'question', len: Math.max(0, prompt - dropped) },
      { kind: 'cot', len: gen - Math.max(0, dropped - prompt) },
    ],
  };
}

/** context length against generated tokens: exact corners of the sawtooth */
export function inftyCurve(steps: Step[]): [number, number][] {
  const st = starts(steps);
  const pts: [number, number][] = [];
  steps.forEach((s, i) => {
    pts.push([st[i], s.ctx], [st[i] + s.tok.length, s.ctx + s.tok.length]);
  });
  return pts;
}

export function cotCurve(prompt: number, total: number, maxSeq: number): [number, number][] {
  const pts: [number, number][] = [[0, prompt]];
  const hit = maxSeq - prompt;
  if (hit > 0 && hit < total) pts.push([hit, maxSeq]);
  pts.push([total, Math.min(maxSeq, prompt + total)]);
  return pts;
}

/** the corners up to g, plus the live point at g */
export function upTo(pts: [number, number][], g: number): [number, number][] {
  const out = pts.filter(([a]) => a <= g);
  const end = pts[pts.length - 1][0];
  const x = Math.min(g, end);
  // value at x on the last segment that contains it
  for (let k = pts.length - 1; k > 0; k--) {
    const [a0, b0] = pts[k - 1];
    const [a1, b1] = pts[k];
    if (x >= a0 && x <= a1 && a1 > a0) {
      out.push([x, b0 + ((x - a0) / (a1 - a0)) * (b1 - b0)]);
      break;
    }
  }
  return out;
}
