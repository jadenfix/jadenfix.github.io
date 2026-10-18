// Shapes of public/data/chain/*.json.
//
// devnet-session.json is exported by scripts/bench/export_session.py in github.com/jadenfix/arrha
// from the consensus event logs (AETHER_EVENT_LOG) of a real 4-validator devnet run: four
// aether-node processes on one Apple M4 over localhost, 100 tx/s of transfers, validator 3
// killed and restarted mid-run. Every time below was written by a validator as it happened;
// nothing is interpolated or synthesised.
//
// benchmarks.json holds the measured devnet results (scripts/bench/run-benchmarks.sh) next to
// public, dated Bitcoin and Solana figures with their sources.

export type ValidatorId = number; // 1-based, genesis order

export interface Validator {
  id: ValidatorId;
  short: string; // first 4 bytes of the address, hex
  address: string;
}

export interface Block {
  hash: string; // first 4 bytes, hex
  slot: number;
  parent: string;
  parentSlot: number;
  proposer: ValidatorId;
  txs: number;
  proposedAt?: number; // ms from the start of the load
  seen: number | null; // first time any validator had it
  recv: Record<string, number>; // validator -> received at
  votes: Record<string, number>; // validator -> voted at
  qc: Record<string, number>; // validator -> saw the quorum certificate form at
  qcSigners?: ValidatorId[];
  parentQcSigners?: ValidatorId[];
  qcAt: number | null; // first validator to hold a QC for this block
  final: Record<string, number>; // validator -> finalized at
  finalAt: number | null;
  prunedAt?: number; // dropped because a conflicting block was finalized
}

export interface Session {
  source: string;
  scenario: string;
  slotMs: number;
  startMs: number;
  window: [number, number];
  validators: Validator[];
  down: { validator: ValidatorId; from: number; to: number }[];
  blocks: Block[];
  summary: { blocks: number; finalized: number; pruned: number; proposeToFinalMsP50: number | null };
}

export interface Source {
  label: string;
  url: string;
  accessed: string;
}

export interface Row {
  metric: string;
  arrha: string;
  bitcoin: string;
  solana: string;
  note?: string;
}

export interface Benchmarks {
  machine: string;
  commit: string;
  measuredOn: string;
  rows: Row[];
  sweeps: { mode: 'transfer' | 'contract'; offered: number; finalizedTps: number; p50: number; p95: number; p99: number; lost: number }[];
  bls: { single: number; batch: number; aggregate: number; count: number };
  sources: Record<string, Source>;
  caveats: string[];
}

async function getJson<T>(name: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/chain/${name}`);
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return (await r.json()) as T;
}

export const loadSession = () => getJson<Session>('devnet-session.json');
export const loadBenchmarks = () => getJson<Benchmarks>('benchmarks.json');

/** first value <= t in a validator->time map, as a count */
export function countBy(map: Record<string, number>, t: number): number {
  let n = 0;
  for (const k in map) if (map[k] <= t) n += 1;
  return n;
}

export function isDown(session: Session, v: ValidatorId, t: number): boolean {
  return session.down.some((d) => d.validator === v && t >= d.from && t < d.to);
}
