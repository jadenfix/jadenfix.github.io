import { useEffect, useRef } from 'react';
import { startField, type FieldMode } from './fieldEngine';

/** The render-where-observed field (see fieldEngine.ts) on one canvas. */
export default function RenderField({ className = '', mode = 'local', strength = 1 }: { className?: string; mode?: FieldMode; strength?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => startField(ref.current!, mode, strength), [mode, strength]);
  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
