import { useEffect, useRef, useState } from 'react';
import type { Beacon } from '../demos/simulation/data';
import { reducedMotion } from '../motion';

// Two bit streams side by side. One is NIST's beacon, the other is the
// browser's CSPRNG: a deterministic program, seeded once. Guess which one is
// the program. Each runs a KT Bayes factor for "this source is biased" as it goes.

const WIDTH = 32;
const ROWS = 9;

type Side = { name: 'beacon' | 'program'; at: number; ones: number; n: number; lbf: number; rows: string[] };

function freshSide(name: Side['name'], at: number): Side {
  return { name, at, ones: 0, n: 0, lbf: 0, rows: [] };
}

function push(s: Side, bit: number) {
  const p1 = (s.ones + 0.5) / (s.n + 1);
  s.lbf += Math.log((bit ? p1 : 1 - p1) / 0.5);
  s.ones += bit;
  s.n += 1;
}

export default function TwoStreams({ beacon }: { beacon: Beacon }) {
  // which column is which is decided once per visit
  const [order] = useState(() => (crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 0 : 1));
  const [guess, setGuess] = useState<number | null>(null);
  const names: Side['name'][] = order ? ['beacon', 'program'] : ['program', 'beacon'];
  // a snapshot of the tallies the timer below keeps
  const [sides, setSides] = useState<Side[]>(() => names.map((n) => freshSide(n, 0)));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const still = reducedMotion();
    let timer = 0;
    let on = false;
    const word = new Uint32Array(1);
    const start = (crypto.getRandomValues(new Uint32Array(1))[0] % (beacon.bits.length - 40000)) & ~511;
    const live = names.map((n) => freshSide(n, n === 'beacon' ? start : 0));
    const step = () => {
      for (const s of live) {
        let row = '';
        for (let i = 0; i < WIDTH; i++) {
          let bit: number;
          if (s.name === 'beacon') bit = beacon.bits[(s.at + s.n) % beacon.bits.length];
          else {
            if (i % 32 === 0) crypto.getRandomValues(word);
            bit = (word[0] >>> (31 - (i % 32))) & 1;
          }
          push(s, bit);
          row += bit ? '1' : '0';
        }
        s.rows = [row, ...s.rows].slice(0, ROWS);
      }
      setSides(live.map((s) => ({ ...s })));
    };
    // fill the screen first, then trickle
    for (let i = 0; i < ROWS; i++) step();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on && !still) {
        on = true;
        timer = window.setInterval(step, 140);
      } else if (!e.isIntersecting && on) {
        on = false;
        window.clearInterval(timer);
      }
    });
    io.observe(box.current!);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beacon]);

  const revealed = guess !== null;
  const right = revealed && sides[guess].name === 'program';

  return (
    <div ref={box} className="font-mono">
      <div className="grid gap-6 sm:grid-cols-2">
        {sides.map((s, k) => (
          <div key={k}>
            <div className="mb-2 flex items-baseline justify-between text-[11px]">
              <span className="text-phos">source {k ? 'B' : 'A'}</span>
              <span className={`transition-opacity duration-700 ${revealed ? 'text-bone opacity-100' : 'opacity-0'}`}>
                {s.name === 'beacon' ? 'NIST beacon, chain 2' : 'crypto.getRandomValues'}
              </span>
            </div>
            <pre className="m-0 select-none overflow-hidden text-[12px] leading-[1.5] tracking-[0.12em] text-dim" style={{ height: `${ROWS * 1.5}em` }}>
              {s.rows.map((r, i) => (
                <div key={i} style={{ opacity: 1 - i / (ROWS + 2) }}>
                  {r.replace(/1/g, '▪').replace(/0/g, '·')}
                </div>
              ))}
            </pre>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <span className="text-faint">
                bits <span className="tabular-nums text-bone">{s.n.toLocaleString()}</span>
              </span>
              <span className="text-faint">
                ones <span className="tabular-nums text-bone">{(s.ones / Math.max(1, s.n)).toFixed(4)}</span>
              </span>
              <span className="text-faint">
                ln BF <span className="tabular-nums text-bone">{s.lbf.toFixed(2)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-[12px]">
        <span className="text-faint">which one is the program?</span>
        {[0, 1].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setGuess(k)}
            disabled={revealed}
            className={`transition-colors ${guess === k ? 'text-phos' : revealed ? 'text-faint' : 'text-bone hover:text-phos'}`}
          >
            [ {k ? 'B' : 'A'} ]
          </button>
        ))}
        {revealed && (
          <span className="text-dim">
            {right ? 'right, ' : 'nope, '}
            but there was nothing to go on. both Bayes factors sit a little below zero and sink slowly, which is exactly what fair bits do.
          </span>
        )}
      </div>
    </div>
  );
}
