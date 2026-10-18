/**
 * The paper's sweep protocol (configs/stochastic_paper_local.yaml), made incremental so
 * results can be shown as the 50 collection rollouts accumulate.
 *
 * For each of the 15 sweep seeds: collect 50 rollouts with the prompted behaviour policy
 * (oracle action, 50% exploration) over the four train families, fit one score table per
 * scorer on the first k rollouts, then evaluate each greedy table policy for 50 rollouts on
 * the three eval families. Like the published code, every run builds a fresh environment
 * whose RNG is seeded with 0 (see open PR #2), so at k = 50 and p = 0.75 the means equal
 * Table 1 of the paper exactly.
 */
import { EVAL_TASKS, TRAIN_TASKS, withGateP, type Task } from './benchmark';
import {
  Env,
  PAPER_SEEDS,
  ROLLOUTS,
  SCORERS,
  TableBuilder,
  collect,
  evaluate,
  promptedPolicy,
  stateKey,
  tablePolicy,
  type Episode,
  type ScorerName,
} from './engine';

export type Condition = 'prompted' | ScorerName;
export const CONDITIONS: Condition[] = ['prompted', ...SCORERS];

/** Table 1: 15 seeds x 50 rollouts. */
export const PAPER: Record<Condition, number> = {
  prompted: 0.792,
  outcome_only: 0.24,
  branch_aware: 0.979,
  hindsight: 0.695,
  combined: 1.0,
};

export const GATES = ['start', 'gate_2', 'gate_3', 'gate_4'] as const;

/** Q(gate, action) and visit counts for the gate-chain states, per scorer, at one k. */
export type Credit = Record<ScorerName, { q: Record<string, number>; n: Record<string, number> }[]>;

export type Snapshot = {
  k: number;
  mean: Record<Condition, number>;
  perSeed: Record<Condition, number[]>;
};

export class Protocol {
  readonly p: number;
  readonly train: Task[];
  readonly evals: Task[];
  readonly seeds = PAPER_SEEDS;
  readonly episodes: Episode[][];
  private readonly prompted: number[];
  private readonly builders: Record<ScorerName, TableBuilder>[];
  private readonly fed: number[];
  readonly snapshots: Snapshot[] = [];

  constructor(p: number) {
    this.p = p;
    this.train = TRAIN_TASKS.map((t) => (t.family === 'stoch_gate' ? withGateP(t, p) : t));
    this.evals = EVAL_TASKS.map((t) => (t.family === 'stoch_gate' ? withGateP(t, p) : t));
    this.episodes = this.seeds.map((s) => collect(new Env(0), this.train, promptedPolicy(s), ROLLOUTS));
    this.prompted = this.seeds.map((s) => evaluate(this.evals, promptedPolicy(s)).success);
    this.builders = this.seeds.map(() => {
      const b = {} as Record<ScorerName, TableBuilder>;
      for (const s of SCORERS) b[s] = new TableBuilder(s);
      return b;
    });
    this.fed = this.seeds.map(() => 0);
  }

  /** Feeds rollouts up to k into every seed's tables and evaluates. Snapshots are cached. */
  snapshot(k: number): Snapshot {
    while (this.snapshots.length < k) this.work(Infinity);
    return this.snapshots[k - 1];
  }

  get computed() {
    return this.snapshots.length;
  }

  private partial: { perSeed: Record<Condition, number[]>; i: number } | null = null;

  /** Advances the next snapshot one seed at a time until it completes or `budgetMs` is spent. */
  work(budgetMs: number) {
    const t0 = performance.now();
    while (this.snapshots.length < ROLLOUTS) {
      const k = this.snapshots.length + 1;
      if (!this.partial) {
        const perSeed = { prompted: this.prompted } as Record<Condition, number[]>;
        for (const s of SCORERS) perSeed[s] = [];
        this.partial = { perSeed, i: 0 };
      }
      const part = this.partial;
      const i = part.i++;
      while (this.fed[i] < k) {
        const ep = this.episodes[i][this.fed[i]++];
        for (const s of SCORERS) this.builders[i][s].add(ep);
      }
      for (const s of SCORERS) part.perSeed[s].push(evaluate(this.evals, tablePolicy(this.builders[i][s].table())).success);
      if (part.i === this.seeds.length) {
        const mean = {} as Record<Condition, number>;
        for (const c of CONDITIONS) mean[c] = part.perSeed[c].reduce((a, b) => a + b, 0) / part.perSeed[c].length;
        this.snapshots.push({ k, mean, perSeed: part.perSeed });
        this.partial = null;
        return; // at most one snapshot per call
      }
      if (performance.now() - t0 > budgetMs) return;
    }
  }

  /** Gate-chain credit for one seed after its first k rollouts (recomputed, cheap). */
  credit(seedIdx: number, k: number): Credit {
    const gate = this.train[0];
    const out = {} as Credit;
    for (const s of SCORERS) {
      const b = new TableBuilder(s);
      for (const ep of this.episodes[seedIdx].slice(0, k)) if (ep.task === gate) b.add(ep);
      out[s] = GATES.map((node) => {
        const key = stateKey(gate, node);
        const sum = b.sum.get(key);
        const cnt = b.count.get(key);
        const q: Record<string, number> = {};
        const n: Record<string, number> = {};
        if (sum && cnt)
          for (const [a, v] of sum) {
            q[a] = v / cnt.get(a)!;
            n[a] = cnt.get(a)!;
          }
        return { q, n };
      });
    }
    return out;
  }

  /** Gate-chain episodes of the greedy policy learned by `scorer` for one seed (eval run). */
  replay(seedIdx: number, scorer: ScorerName): Episode[] {
    const b = new TableBuilder(scorer);
    for (const ep of this.episodes[seedIdx]) b.add(ep);
    const env = new Env(0);
    const policy = tablePolicy(b.table());
    const eps = collect(env, this.evals, policy, ROLLOUTS);
    return eps.filter((e) => e.task.family === 'stoch_gate');
  }
}
