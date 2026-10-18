import { useMemo, type KeyboardEvent } from 'react';
import type { DirtyReason, Edge, Span, SpanStatus } from './data';
import { KIND_SHORT, REASON_SHORT, ROW_H, STATUS_COLOR } from './labels';

const GUTTER = 30;

export type RowState =
  | { kind: 'recorded'; status: SpanStatus }
  | { kind: 'dirty'; status: SpanStatus; reasons: DirtyReason[]; blocked: boolean }
  | { kind: 'cached'; status: SpanStatus }
  | { kind: 'rollup'; status: SpanStatus; changed: boolean } // container: status re-derived from replayed children
  | { kind: 'queued'; status: SpanStatus }
  | { kind: 'running' }
  | { kind: 'replayed'; status: SpanStatus; changed: boolean };

/** span tree in recorded order, recorded data edges drawn as arcs in the left gutter */
export function Tree({
  spans,
  edges,
  duration,
  rows,
  selected,
  hot,
  onSelect,
}: {
  spans: Span[];
  edges: Edge[];
  duration: number;
  rows: Record<string, RowState>;
  selected: string | null;
  hot: Set<string>; // edges (from>to) carrying the dirty set
  onSelect: (id: string) => void;
}) {
  const { depthOf, rowOf } = useMemo(() => {
    const d = new Map<string, number>();
    for (const s of spans) d.set(s.id, s.parent ? (d.get(s.parent) ?? 0) + 1 : 0);
    return { depthOf: d, rowOf: new Map(spans.map((s, i) => [s.id, i])) };
  }, [spans]);
  const key = (ev: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    const next = (ev.currentTarget.parentElement?.parentElement?.querySelectorAll('button[data-row]')[i + d] as HTMLButtonElement | undefined) ?? null;
    next?.focus();
  };
  const h = spans.length * ROW_H;
  return (
    <div className="relative" style={{ height: h }}>
      <svg className="pointer-events-none absolute left-0 top-0" width={GUTTER} height={h} aria-hidden>
        {edges.map((e) => {
          const a = rowOf.get(e.to)!;
          const b = rowOf.get(e.from)!;
          const y1 = a * ROW_H + ROW_H / 2;
          const y2 = b * ROW_H + ROW_H / 2;
          const bulge = Math.min(GUTTER - 4, 7 + Math.abs(b - a) * 2.2);
          const x = GUTTER - 2;
          const on = hot.has(`${e.from}>${e.to}`);
          return (
            <g key={`${e.from}>${e.to}`} style={{ transition: 'opacity 400ms' }} opacity={on ? 1 : 0.55}>
              <path d={`M${x} ${y1} C${x - bulge} ${y1}, ${x - bulge} ${y2}, ${x} ${y2}`} fill="none" stroke={on ? '#e8a96a' : '#34322e'} strokeWidth={on ? 1.2 : 1} />
              <path d={`M${x - 4} ${y2 - 2.5} L${x} ${y2} L${x - 4} ${y2 + 2.5}`} fill="none" stroke={on ? '#e8a96a' : '#34322e'} strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      <ul className="absolute inset-y-0 right-0" style={{ left: GUTTER }}>
        {spans.map((s, i) => {
          const st = rows[s.id];
          const isSel = selected === s.id;
          const dim = st.kind === 'cached';
          const dirty = st.kind === 'dirty' || st.kind === 'running' || st.kind === 'queued' || st.kind === 'replayed';
          const derived = st.kind === 'rollup';
          let tag: { text: string; color: string; pulse?: boolean };
          switch (st.kind) {
            case 'dirty':
              tag = st.blocked ? { text: 'blocked', color: '#c4ccde' } : { text: REASON_SHORT[st.reasons[0]], color: '#e8a96a' };
              break;
            case 'cached':
              tag = { text: 'reused', color: '#58554e' };
              break;
            case 'rollup':
              tag = { text: st.changed ? st.status.toLowerCase() : 'from children', color: st.changed ? STATUS_COLOR[st.status] : '#8d887c' };
              break;
            case 'queued':
              tag = { text: 'queued', color: '#8d887c' };
              break;
            case 'running':
              tag = { text: 'running', color: '#e8a96a', pulse: true };
              break;
            default:
              tag = { text: st.status.toLowerCase(), color: STATUS_COLOR[st.status] };
          }
          const left = (s.t0 / duration) * 100;
          const width = Math.max(0.8, ((s.t1 - s.t0) / duration) * 100);
          return (
            <li key={s.id} style={{ height: ROW_H }}>
              <button
                type="button"
                data-row
                onClick={() => onSelect(s.id)}
                onKeyDown={(ev) => key(ev, i)}
                aria-pressed={isSel}
                aria-label={`step ${s.seq}, ${KIND_SHORT[s.kind]} ${s.name}, ${tag.text}`}
                className={`group flex h-full w-full items-center gap-2 border-l pr-2 text-left text-[11.5px] transition-[background-color,border-color,opacity] duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-phos ${
                  isSel
                    ? 'border-phos bg-phos/[0.07]'
                    : dirty
                      ? 'border-phos/50 bg-phos/[0.03] hover:bg-bone/[0.04]'
                      : derived
                        ? 'border-dashed border-phos/30 hover:bg-bone/[0.04]'
                        : 'border-transparent hover:bg-bone/[0.04]'
                } ${dim ? 'opacity-45' : ''}`}
                style={{ paddingLeft: 6 + (depthOf.get(s.id) ?? 0) * 12 }}
              >
                <span className="w-[42px] shrink-0 text-[10px] text-faint">{KIND_SHORT[s.kind]}</span>
                <span className={`min-w-0 flex-1 truncate ${isSel ? 'text-bone' : 'text-bone/85'}`}>{s.name}</span>
                <span className={`shrink-0 text-right text-[10px] ${tag.pulse ? 'animate-breathe' : ''}`} style={{ color: tag.color }}>
                  {tag.text}
                  {(st.kind === 'replayed' || st.kind === 'rollup') && st.changed ? <span className="text-phos"> *</span> : null}
                </span>
                <span className="relative hidden h-[5px] w-[96px] shrink-0 lg:block" aria-hidden>
                  <span className="absolute inset-y-[2px] left-0 right-0 bg-line" />
                  <span
                    className="absolute inset-y-0 transition-colors duration-300"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: st.kind === 'running' || st.kind === 'replayed' ? '#e8a96a' : st.kind === 'cached' ? '#58554e' : '#8d887c',
                    }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
