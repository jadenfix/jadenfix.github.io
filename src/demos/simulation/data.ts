// Loads the two real-data summaries committed in simulation-theory/data/real/ (copied verbatim to public/data/simulation/)
// and re-verifies them in the browser where the browser can: the NIST beacon's SHA-512 precommitment chain.
import { beaconBits, hexToBytes, type BellTrial } from './math';

const BASE = `${import.meta.env.BASE_URL}data/simulation/`;

interface DelftFile {
  schema: string;
  source: { dataset_doi: string; paper: string; published_values: { trials: number; S: number; S_error: number; p_value: number } };
  raw: { rows: number; archive_md5: string };
  trials: [string, number, number, number, number][];
}

export interface BeaconPulse {
  pulseIndex: number;
  timeStamp: string;
  localRandomValue: string;
  precommitmentValue: string;
}

interface BeaconFile {
  schema: string;
  chain: number;
  first_pulse: number;
  count: number;
  pulses: BeaconPulse[];
}

export interface Delft {
  trials: BellTrial[];
  rawRows: number;
  published: DelftFile['source']['published_values'];
}

export interface Beacon {
  bits: Uint8Array; // 512 bits per pulse, the final pulse excluded
  chain: number;
  firstPulse: number;
  pulses: number;
  firstTime: string;
  lastTime: string;
  /** pulse index and timestamp for bit i */
  pulseOf: (bit: number) => { index: number; time: string };
  /** all committed pulses, including the last one kept only for its precommitment check */
  raw: BeaconPulse[];
}

let delftPromise: Promise<Delft> | null = null;
export function loadDelft(): Promise<Delft> {
  delftPromise ??= fetch(`${BASE}delft2015-bell-trials.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<DelftFile>;
    })
    .then((f) => {
      if (f.schema !== 'simulation-theory.real-data.bell-trials/v1') throw new Error('schema');
      const trials = f.trials.map(([t, a, b, x, y]) => ({ t, a, b, x, y }) as BellTrial);
      return { trials, rawRows: f.raw.rows, published: f.source.published_values };
    });
  return delftPromise;
}

let beaconPromise: Promise<Beacon> | null = null;
export function loadBeacon(): Promise<Beacon> {
  beaconPromise ??= fetch(`${BASE}nist-beacon-chain2-pulses.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<BeaconFile>;
    })
    .then((f) => {
      if (f.schema !== 'simulation-theory.real-data.nist-beacon/v1') throw new Error('schema');
      const used = f.pulses.slice(0, -1);
      return {
        bits: beaconBits(used.map((p) => p.localRandomValue)),
        chain: f.chain,
        firstPulse: f.first_pulse,
        pulses: used.length,
        firstTime: used[0].timeStamp,
        lastTime: used[used.length - 1].timeStamp,
        pulseOf: (bit: number) => {
          const p = used[Math.min(used.length - 1, Math.floor(bit / 512))];
          return { index: p.pulseIndex, time: p.timeStamp };
        },
        raw: f.pulses,
      };
    });
  return beaconPromise;
}

/**
 * SHA-512(localRandomValue[i+1]) === precommitmentValue[i] for every consecutive pair, checked with WebCrypto.
 * Resolves to [verified, total], or null where WebCrypto is unavailable (insecure context).
 */
export async function verifyBeacon(beacon: Beacon): Promise<[number, number] | null> {
  const raw = beacon.raw;
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  let ok = 0;
  for (let i = 0; i + 1 < raw.length; i++) {
    const bytes = hexToBytes(raw[i + 1].localRandomValue);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', bytes as BufferSource));
    let hex = '';
    for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
    if (hex.toUpperCase() === raw[i].precommitmentValue.toUpperCase()) ok += 1;
  }
  return [ok, raw.length - 1];
}

/** Uniform [0,1) from the browser CSPRNG, buffered. */
const POOL = new Uint32Array(1024);
let poolAt = POOL.length;
export function csprngUniform(): number {
  if (poolAt >= POOL.length) {
    crypto.getRandomValues(POOL);
    poolAt = 0;
  }
  return POOL[poolAt++] / 4294967296;
}
