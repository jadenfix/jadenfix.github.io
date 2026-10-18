import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DUR, EASE } from './motion';

// Real sessions recorded by rusty's own `cargo xtask record`, idle pauses
// trimmed. Notes paraphrase what each recording shows.
const sessions = [
  { key: 'fix', cmd: 'fix the discount bug', src: '/media/rusty-hero.gif', note: 'Finds two real bugs in a discount module, fixes both, and proves it by running the tests.' },
  { key: 'goal', cmd: '/goal', src: '/media/rusty-goal.gif', note: 'Plans, writes a CLI and its tests, runs them, checks edge cases by hand. It can only finish by handing over evidence.' },
  { key: 'swarm', cmd: '/agents auto', src: '/media/rusty-swarm.gif', note: 'Four read-only workers audit four modules in parallel and merge a ranked bug list. The two real bugs come out on top.' },
  { key: 'compact', cmd: '/compact', src: '/media/rusty-compact.gif', note: '12.6k tokens of context become 864, and the follow-up is answered without re-reading a file.' },
  { key: 'models', cmd: '/model', src: '/media/rusty-models.gif', note: 'One model fixes the bug, a bigger one reviews the fix mid-session with the whole conversation in view.' },
  { key: 'focus', cmd: '/view adhd', src: '/media/rusty-focus.gif', note: 'A three-bullet answer, a saved lesson, the permission classifier at work, and where every token went.' },
];

export default function RustyPlayer({ auto = false }: { auto?: boolean }) {
  const [i, setI] = useState(0);
  const [touched, setTouched] = useState(false);
  const s = sessions[i];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20% 0px' });

  // walk through the sessions on its own until someone picks one
  useEffect(() => {
    if (!auto || touched || !inView) return;
    const id = window.setTimeout(() => setI((v) => (v + 1) % sessions.length), 15000);
    return () => window.clearTimeout(id);
  }, [auto, touched, inView, i]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setTouched(true);
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % sessions.length);
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + sessions.length) % sessions.length);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={ref} className="border border-line bg-black" tabIndex={-1}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[11px] text-faint">
        <span>
          <span className="text-dim">~/shop</span> <span className="text-phos">›</span> rusty <span className="text-bone">{s.cmd}</span>
        </span>
        <span>
          {i + 1}/{sessions.length}
        </span>
      </div>
      <div className="relative aspect-[957/735] w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={s.key}
            src={s.src}
            alt={`rusty session: ${s.cmd}`}
            className="absolute inset-0 h-full w-full object-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.short, ease: EASE.out }}
          />
        </AnimatePresence>
      </div>
      <div className="border-t border-line px-4 py-3">
        <p className="min-h-[44px] text-[12.5px] leading-[1.75] text-dim">{s.note}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]" role="tablist" aria-label="rusty sessions">
          {sessions.map((x, j) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={j === i}
              onClick={() => {
                setTouched(true);
                setI(j);
              }}
              className={`transition-colors ${j === i ? 'text-phos' : 'text-faint hover:text-bone'}`}
            >
              {x.cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
