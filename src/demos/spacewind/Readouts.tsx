import type { ReactNode } from 'react';

export type Readout = { k: string; v: ReactNode; sub: ReactNode; hot?: boolean };

/** four live numbers under the stage, 2 x 2 on a phone */
export default function Readouts({ items }: { items: Readout[] }) {
  return (
    <dl className="grid grid-cols-2 border-x border-b border-line sm:grid-cols-4">
      {items.map((r, i) => (
        <div
          key={r.k}
          className={`min-w-0 px-3 py-3 sm:px-4 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}
        >
          <dt className="text-[10px] lowercase tracking-[0.14em] text-dim">{r.k}</dt>
          <dd className={`mt-1 truncate font-serif text-[24px] leading-none tabular-nums sm:text-[26px] ${r.hot ? 'text-phos' : 'text-bone'}`}>{r.v}</dd>
          <dd className="mt-1 truncate text-[10px] text-faint">{r.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
