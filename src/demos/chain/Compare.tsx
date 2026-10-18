import type { Benchmarks } from './data';

const RED = '#ec5c52';

/** source keys look like [btc-blocks]; render them as superscript links */
function Cited({ text, b }: { text: string; b: Benchmarks }) {
  const parts = text.split(/(\[[a-z0-9-]+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[([a-z0-9-]+)\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        const keys = Object.keys(b.sources);
        const src = b.sources[m[1]];
        return src ? (
          <a key={i} href={src.url} target="_blank" rel="noreferrer" className="link-u ml-0.5 align-super text-[8.5px] text-dim" title={`${src.label} (${src.accessed})`}>
            {keys.indexOf(m[1]) + 1}
          </a>
        ) : null;
      })}
    </>
  );
}

export function Compare({ bench }: { bench: Benchmarks }) {
  const cols = ['arrha devnet', 'bitcoin mainnet', 'solana mainnet'];
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden pr-1 text-[11px] leading-[1.6]" tabIndex={0} aria-label="comparison with bitcoin and solana">
      <p className="border border-line px-3 py-2 text-[11px] leading-[1.7]" style={{ borderColor: `${RED}66` }}>
        <span style={{ color: RED }}>not a like-for-like comparison. </span>
        <span className="text-dim">
          Arrha numbers are from 4 validator processes on one {bench.machine} talking over localhost: no WAN latency, no adversaries, a tiny validator set and no
          real users. Bitcoin and Solana are global production networks. This shows what the code does on one machine, not how Arrha would perform in
          production, and it does not mean Arrha is faster than Solana.
        </span>
      </p>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 border-b border-line pb-1 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-3">
        <span className="label hidden sm:block">metric</span>
        {cols.map((c, i) => (
          <span key={c} className="label truncate" style={i === 0 ? { color: 'rgb(var(--c-phos))' } : undefined}>
            <span className="sm:hidden">{c.split(' ')[0]}</span>
            <span className="hidden sm:inline">{c}</span>
          </span>
        ))}
      </div>
      {bench.rows.map((r) => (
        <div key={r.metric} className="border-b border-line py-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-3">
            <span className="col-span-3 text-bone sm:col-span-1">{r.metric}</span>
            <span className="text-phos">
              <Cited text={r.arrha} b={bench} />
            </span>
            <span className="text-bone/90">
              <Cited text={r.bitcoin} b={bench} />
            </span>
            <span className="text-bone/90">
              <Cited text={r.solana} b={bench} />
            </span>
          </div>
          {r.note ? <p className="mt-0.5 text-[10px] text-faint">{r.note}</p> : null}
        </div>
      ))}

      <h5 className="display mt-4 text-[18px]">what this does and doesn&apos;t show</h5>
      <ul className="mt-1 space-y-1 text-dim">
        {bench.caveats.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-faint">-</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>

      <h5 className="label mt-4">sources</h5>
      <ol className="mt-1 space-y-0.5 text-faint">
        {Object.entries(bench.sources).map(([k, s], i) => (
          <li key={k} className="break-words">
            {i + 1}.{' '}
            <a href={s.url} target="_blank" rel="noreferrer" className="link-u text-dim">
              {s.label}
            </a>{' '}
            ({s.accessed})
          </li>
        ))}
      </ol>
      <p className="mt-3 pb-2 text-[10px] text-faint">
        arrha measured {bench.measuredOn} at commit {bench.commit}; methodology in docs/benchmarks.md of the repo.
      </p>
    </div>
  );
}
