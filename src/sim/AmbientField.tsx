import { useEffect, useState } from 'react';
import RenderField from './RenderField';

// The same world, faint, behind the whole site: it sharpens wherever the
// pointer goes and drifts as you scroll. Demos, charts and the heroes sit on
// solid panels above it. Mouse users only, and not under reduced motion.
// It fades toward the middle of the page so body text stays easy to read.

export default function AmbientField() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const check = () => setOn(fine.matches && !calm.matches);
    check();
    fine.addEventListener('change', check);
    calm.addEventListener('change', check);
    return () => {
      fine.removeEventListener('change', check);
      calm.removeEventListener('change', check);
    };
  }, []);
  if (!on) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        maskImage: 'linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 22%, rgba(0,0,0,0.32) 50%, rgba(0,0,0,0.5) 78%, #000 100%)',
        WebkitMaskImage: 'linear-gradient(to right, #000 0%, rgba(0,0,0,0.5) 22%, rgba(0,0,0,0.32) 50%, rgba(0,0,0,0.5) 78%, #000 100%)',
      }}
    >
      <RenderField mode="ambient" strength={0.5} />
    </div>
  );
}
