import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { CELL_STYLE, type CellState, type Tally } from './data';

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** a number that eases to its new value */
export function Count({ value, reduce }: { value: number; reduce: boolean }) {
  const mv = useMotionValue(value);
  const shown = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: reduce ? 0 : 1.1, ease: EASE });
    return () => c.stop();
  }, [mv, value, reduce]);
  return <motion.span>{shown}</motion.span>;
}

/** a 0..1 track with the 95% Wilson interval and the point estimate */
export function WilsonBar({ tally, reduce, delay }: { tally: Tally; reduce: boolean; delay: number }) {
  const [count, n, lo, hi] = tally;
  const W = 64;
  const x = (v: number) => 0.5 + v * (W - 1);
  const t = { duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE };
  return (
    <svg width={W} height={9} viewBox={`0 0 ${W} 9`} aria-hidden className="block shrink-0 overflow-visible">
      <line x1={0.5} x2={W - 0.5} y1={4.5} y2={4.5} stroke="#252421" />
      <line x1={0.5} x2={0.5} y1={2} y2={7} stroke="#34322e" />
      <line x1={W - 0.5} x2={W - 0.5} y1={2} y2={7} stroke="#34322e" />
      <motion.line initial={false} animate={{ x1: x(lo), x2: x(hi) }} transition={t} y1={4.5} y2={4.5} stroke="#8d887c" />
      <motion.rect initial={false} animate={{ x: x(count / n) - 2 }} transition={t} y={2.5} width={4} height={4} fill="#dcd6c8" />
    </svg>
  );
}

export function Swatch({ state }: { state: CellState }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 border" style={CELL_STYLE[state]} />;
}
