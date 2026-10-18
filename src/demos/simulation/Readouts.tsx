export interface Readout {
  k: string;
  /** shorter label for narrow screens */
  ks?: string;
  v: string;
  /** shorter value for narrow screens */
  vs?: string;
  sub: string;
  color: string;
}

export function Readouts({ items }: { items: Readout[] }) {
  return (
    <dl className="grid h-[64px] grid-cols-4 border-x border-b border-line">
      {items.map((r, i) => (
        <div key={r.k} className={`min-w-0 px-2 py-2 sm:px-3 ${i ? 'border-l border-line' : ''}`}>
          <dt className="truncate text-[9px] lowercase tracking-[0.12em] text-dim sm:text-[10px]">
            <span className="sm:hidden">{r.ks ?? r.k}</span>
            <span className="hidden sm:inline">{r.k}</span>
          </dt>
          <dd className="mt-1 truncate font-serif text-[18px] leading-none tabular-nums sm:text-[22px]" style={{ color: r.color }}>
            <span className="sm:hidden">{r.vs ?? r.v}</span>
            <span className="hidden sm:inline">{r.v}</span>
          </dd>
          <dd className="mt-1 hidden truncate text-[10px] text-faint sm:block">{r.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

