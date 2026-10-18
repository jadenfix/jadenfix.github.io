import type { CSSProperties } from 'react';

/** Shape of public/data/fsbench.json, exported from FullStack-Bench's reporting-v1 ledger. */

/** [count, n, wilson95 low, wilson95 high] */
export type Tally = [number, number, number, number];

export type Run = {
  /** index into harnesses */
  h: number;
  /** index into tasks */
  t: number;
  s: number;
  /** ok = SafeSuccess, fail = eligible but not SafeSuccess, invalid = excluded (invalid evidence) */
  st: 'ok' | 'fail' | 'invalid';
  /** final_artifact, deployed_at_handoff, whole_episode, recovery: 1 pass, 0 fail, null did not run */
  v: [number | null, number | null, number | null, number | null];
  /** checks that did not pass, per view */
  x: [string[], string[], string[], string[]];
  /** the admission record's reason */
  r: string;
  /** model calls admitted */
  c: number;
};

export type BenchData = {
  source: string;
  cohort: string;
  model: string;
  temperature: number;
  calls_cap: number;
  rev: string;
  harnesses: { id: string; note: string }[];
  tasks: string[];
  seeds: number[];
  views: string[];
  tally: Record<string, { final_artifact: Tally; whole_episode: Tally; safe_success: Tally }>;
  runs: Run[];
};

export type ViewKey = 'final' | 'episode' | 'safe';

export const VIEWS: { key: ViewKey; label: string; tally: 'final_artifact' | 'whole_episode' | 'safe_success'; def: string }[] = [
  {
    key: 'final',
    label: 'final state',
    tally: 'final_artifact',
    def: 'the usual check: is the state the agent left behind correct?',
  },
  {
    key: 'episode',
    label: 'whole episode',
    tally: 'whole_episode',
    def: 'did anything prohibited happen on the way: an incident the agent caused, or broken evidence? it does not ask whether the work got done.',
  },
  {
    key: 'safe',
    label: 'safe success',
    tally: 'safe_success',
    def: 'the change is done, the required recovery passed, nothing prohibited happened, and the run finished inside its budget.',
  },
];

export const VIEW_NAMES = ['final state', 'at handoff', 'whole episode', 'recovery'];

export const TASK_SHORT: Record<string, [string, string]> = {
  'ship-checkout-v2': ['checkout v2', 'checkout'],
  'stop-double-charges': ['double charges', 'charges'],
  'merge-duplicate-contacts': ['merge contacts', 'contacts'],
  'stop-report-connection-leak': ['conn leak', 'conn leak'],
};

export type CellState = 'pass' | 'looked' | 'fail' | 'invalid' | 'empty';

/** pass: passes this view. looked: passed the final-state check but fails this view. fail: fails both. */
export function cellState(run: Run | undefined, view: ViewKey): CellState {
  if (!run) return 'empty';
  if (run.st === 'invalid') return 'invalid';
  const final = run.v[0] === 1;
  const pass = view === 'final' ? final : view === 'episode' ? run.v[2] === 1 : run.st === 'ok';
  if (pass) return 'pass';
  return final ? 'looked' : 'fail';
}

export function humanCheck(name: string): string {
  return name.replace(/test_/g, '').replace(/_/g, ' ');
}

export const CELL_STYLE: Record<CellState, CSSProperties> = {
  pass: { backgroundColor: 'rgba(143,181,154,0.72)', borderColor: 'rgba(143,181,154,0.9)', boxShadow: '0 0 0 rgba(236,92,82,0)' },
  looked: { backgroundColor: 'rgba(236,92,82,0.74)', borderColor: 'rgba(236,92,82,0.9)', boxShadow: '0 0 9px rgba(236,92,82,0.2)' },
  fail: { backgroundColor: '#151513', borderColor: '#2e2d29', boxShadow: '0 0 0 rgba(236,92,82,0)' },
  invalid: { backgroundColor: 'rgba(11,11,10,0)', borderColor: '#58554e', borderStyle: 'dashed', boxShadow: '0 0 0 rgba(236,92,82,0)' },
  empty: { backgroundColor: '#121211', borderColor: '#1d1c1a', boxShadow: '0 0 0 rgba(236,92,82,0)' },
};
