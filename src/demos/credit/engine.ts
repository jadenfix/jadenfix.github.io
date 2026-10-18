/**
 * TypeScript port of the controlled stochastic pipeline in jadenfix/CreditAssignment.
 *
 *   GraphManifestEnv.step / verify_transition   envs/manifest_graph.py
 *   PromptedPolicyBackend.act                   policies/prompted.py
 *   TablePolicyBackend.act                      policies/table.py
 *   RolloutEngine._collect_episode              rollout/engine.py
 *   *_transition_score, SCORER_WEIGHTS          verifiers/scorers.py
 *   ScoredTableTrainer.fit                      trainers/outcome_only.py
 *   SweepRunner (collect, train, evaluate)      analysis/sweep.py
 *
 * Behaviour is kept as the Python has it, including two quirks worth knowing:
 * verifier events are read from the *attempted* edge even when a stochastic
 * attempt fails, and the episode success flag is set by that `success` event.
 */
import { PyRandom } from './mt';
import type { Task } from './benchmark';

export const WEIGHTS = {
  verifier: 0.25, // w_v
  deadEnd: 0.5, // w_d
  pivotal: 0.75, // w_p
  recovery: 0.5, // w_r
  enabling: 0.5, // w_e
  firstTurn: 0.1,
} as const;

export const MAX_TURNS = 15; // configs/stochastic_paper_local.yaml
export const ROLLOUTS = 50;
export const EXPLORATION = 0.5;
export const PAPER_SEEDS = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];

export type ScorerName = 'outcome_only' | 'branch_aware' | 'hindsight' | 'combined';
export const SCORERS: ScorerName[] = ['outcome_only', 'branch_aware', 'hindsight', 'combined'];

export type VEvent = { name: string; score: number; recovery?: boolean; enabling?: boolean };

export type Step = {
  from: string; // raw node before
  to: string; // raw node after
  key: string; // abstract state hash of `from`
  action: string;
  failed: boolean; // stochastic attempt failed
  obs: string;
  events: readonly VEvent[];
};

export type Episode = { task: Task; steps: Step[]; success: boolean; terminal: boolean; turns: number };

const keyCache = new WeakMap<Task, Map<string, string>>();
const actCache = new WeakMap<Task, Map<string, string[]>>();

/** stable_hash(abstract_state): sorted-key JSON is an injective stand-in for the sha256 prefix. */
export function stateKey(task: Task, node: string): string {
  let m = keyCache.get(task);
  if (!m) keyCache.set(task, (m = new Map()));
  let k = m.get(node);
  if (k === undefined) {
    const st = task.states[node];
    const abs: Record<string, string | number> = { phase: st.phase, mode: st.mode, progress: st.progress, ...st.fields };
    k = JSON.stringify(Object.keys(abs).sort().map((f) => [f, abs[f]]));
    m.set(node, k);
  }
  return k;
}

/** payload.available_actions = sorted(node.edges) */
export function availableActions(task: Task, node: string): string[] {
  let m = actCache.get(task);
  if (!m) actCache.set(task, (m = new Map()));
  let a = m.get(node);
  if (!a) m.set(node, (a = Object.keys(task.states[node].edges).sort()));
  return a;
}

export type Policy = (task: Task, node: string) => string;

/** PromptedPolicyBackend: oracle with prob 1 - exploration, else uniform over available. */
export function promptedPolicy(seed: number, exploration = EXPLORATION): Policy {
  const rng = new PyRandom(seed);
  return (task, node) => {
    const available = availableActions(task, node);
    const oracle = task.states[node].oracle;
    if (!available.length) return 'noop';
    if (oracle && available.includes(oracle) && rng.random() >= exploration) return oracle;
    return available[rng.randrange(available.length)];
  };
}

export type Table = Map<string, Map<string, number>>;

/** TablePolicyBackend: argmax over available (unseen = -inf, first wins ties); unseen state -> random. */
export function tablePolicy(table: Table, fallbackSeed = 0): Policy {
  const rng = new PyRandom(fallbackSeed);
  const greedy = new Map<string[], string>(); // argmax is fixed per (task, node); keyed by its cached action list
  return (task, node) => {
    const available = availableActions(task, node);
    if (!available.length) return 'noop';
    const key = stateKey(task, node);
    const scores = table.get(key);
    if (scores && scores.size) {
      const memo = greedy.get(available);
      if (memo) return memo;
      let best = available[0];
      let bestV = scores.get(best) ?? -Infinity;
      for (const a of available.slice(1)) {
        const v = scores.get(a) ?? -Infinity;
        if (v > bestV) {
          best = a;
          bestV = v;
        }
      }
      greedy.set(available, best);
      return best;
    }
    return rng.choice(available);
  };
}

/** One GraphManifestEnv instance: its RNG is random.Random(0) (create_env never passes a seed). */
export class Env {
  rng: PyRandom;
  constructor(seed = 0) {
    this.rng = new PyRandom(seed);
  }

  step(task: Task, node: string, action: string): { to: string; obs: string; terminal: boolean; failed: boolean } {
    const edge = task.states[node].edges[action];
    if (!edge) return { to: node, obs: 'That action is invalid from the current state.', terminal: false, failed: true };
    const p = edge.p ?? 1;
    if (p < 1 && this.rng.random() > p) {
      return { to: edge.failNode ?? node, obs: edge.failObs ?? 'The action did not succeed this time.', terminal: false, failed: true };
    }
    return { to: edge.next, obs: edge.obs, terminal: !!edge.terminal, failed: false };
  }

  /** verify_transition: keyed on the attempted edge, whatever the stochastic outcome. */
  verify(task: Task, node: string, action: string): readonly VEvent[] {
    let m = verifyCache.get(task);
    if (!m) verifyCache.set(task, (m = new Map()));
    const id = node + '|' + action;
    let events = m.get(id);
    if (events) return events;
    const edge = task.states[node].edges[action];
    if (!edge) events = [{ name: 'action_validity', score: -1 }];
    else {
      events = [{ name: 'progress', score: edge.progress, recovery: edge.recovery, enabling: edge.enabling }];
      if (edge.success || edge.terminal) events.push({ name: 'success', score: edge.success ? 1 : 0 });
      if (edge.deadEnd) events.push({ name: 'dead_end', score: -1 });
      for (const [name, score] of Object.entries(edge.signals ?? {})) events.push({ name, score });
    }
    m.set(id, events);
    return events;
  }
}

const verifyCache = new WeakMap<Task, Map<string, VEvent[]>>();

/** RolloutEngine._collect_episode */
export function runEpisode(env: Env, task: Task, policy: Policy, maxTurns = MAX_TURNS, record = true): Episode {
  let node = 'start';
  const steps: Step[] = [];
  let turns = 0;
  let success = false;
  let terminal = false;
  for (let t = 0; t < maxTurns; t++) {
    const action = policy(task, node);
    const r = env.step(task, node, action);
    const events = env.verify(task, node, action);
    if (record) steps.push({ from: node, to: r.to, key: stateKey(task, node), action, failed: r.failed, obs: r.obs, events });
    turns++;
    node = r.to;
    if (events.some((e) => e.name === 'success' && e.score > 0)) success = true;
    if (r.terminal) {
      terminal = true;
      break;
    }
  }
  return { task, steps, success, terminal, turns };
}

/** Rollouts cycle through tasks in manifest order (RolloutEngine.collect). */
export function collect(env: Env, tasks: Task[], policy: Policy, n = ROLLOUTS, record = true): Episode[] {
  const out: Episode[] = [];
  for (let i = 0; i < n; i++) out.push(runEpisode(env, tasks[i % tasks.length], policy, MAX_TURNS, record));
  return out;
}

/* ── verifiers/scorers.py ── */

export function transitionScore(ep: Episode, i: number, scorer: ScorerName): number {
  const y = ep.success ? 1 : 0;
  const s = ep.steps[i];
  const branch = () => {
    let v = 0;
    let d = 0;
    for (const e of s.events) {
      if (e.name !== 'success') v += e.score;
      if (e.name === 'dead_end') d += 1;
    }
    return WEIGHTS.verifier * v - WEIGHTS.deadEnd * d;
  };
  const hind = () => {
    let b = 0;
    if (s.action === ep.task.pivotal) b += WEIGHTS.pivotal;
    if (ep.task.family === 'recovery' && s.events.some((e) => e.recovery)) b += WEIGHTS.recovery;
    if (ep.task.family === 'enabling' && s.events.some((e) => e.enabling)) b += WEIGHTS.enabling;
    if (ep.success && i === 0) b += WEIGHTS.firstTurn;
    return b;
  };
  switch (scorer) {
    case 'outcome_only':
      return y;
    case 'branch_aware':
      return y + branch();
    case 'hindsight':
      return y + hind();
    case 'combined':
      return y + branch() + hind();
  }
}

/** Running sums so the table can grow one episode at a time (ScoredTableTrainer.fit is the mean). */
export class TableBuilder {
  sum = new Map<string, Map<string, number>>();
  count = new Map<string, Map<string, number>>();
  readonly scorer: ScorerName;
  constructor(scorer: ScorerName) {
    this.scorer = scorer;
  }

  add(ep: Episode) {
    ep.steps.forEach((s, i) => {
      const v = transitionScore(ep, i, this.scorer);
      if (!this.sum.has(s.key)) {
        this.sum.set(s.key, new Map());
        this.count.set(s.key, new Map());
      }
      const sm = this.sum.get(s.key)!;
      const ct = this.count.get(s.key)!;
      sm.set(s.action, (sm.get(s.action) ?? 0) + v);
      ct.set(s.action, (ct.get(s.action) ?? 0) + 1);
    });
  }

  table(): Table {
    const t: Table = new Map();
    for (const [k, sm] of this.sum) {
      const ct = this.count.get(k)!;
      const m = new Map<string, number>();
      for (const [a, v] of sm) m.set(a, v / ct.get(a)!);
      t.set(k, m);
    }
    return t;
  }
}

export function train(episodes: Episode[], scorer: ScorerName): Table {
  const b = new TableBuilder(scorer);
  for (const ep of episodes) b.add(ep);
  return b.table();
}

export type EvalResult = { success: number; avgTurns: number };

export function evaluate(tasks: Task[], policy: Policy, n = ROLLOUTS, envSeed = 0): EvalResult {
  const eps = collect(new Env(envSeed), tasks, policy, n, false);
  return {
    success: eps.filter((e) => e.success).length / n,
    avgTurns: eps.reduce((a, e) => a + e.turns, 0) / n,
  };
}

/** One sweep seed: collection, then the prompted baseline and four trained conditions. */
export function sweepSeed(seed: number, trainTasks: Task[], evalTasks: Task[], rollouts = ROLLOUTS) {
  const episodes = collect(new Env(0), trainTasks, promptedPolicy(seed), rollouts);
  const res: Record<string, EvalResult> = { prompted: evaluate(evalTasks, promptedPolicy(seed), rollouts) };
  for (const s of SCORERS) res[s] = evaluate(evalTasks, tablePolicy(train(episodes, s)), rollouts);
  return res;
}
