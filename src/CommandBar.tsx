import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { links } from './content';

type Cmd = { name: string; hint: string; run: () => string | void };

const jump = (id: string) => () => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  else window.location.hash = id; // on a blog page: go home, then to the section
};

/** Press / anywhere. A small, quiet way around the page. */
export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [echo, setEcho] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const cmds: Cmd[] = useMemo(
    () => [
      { name: 'research', hint: 'papers, each with live figures', run: jump('research') },
      { name: 'tempera', hint: 'the agent platform', run: jump('tempera') },
      { name: 'rusty', hint: 'watch the coding agent work', run: jump('rusty') },
      { name: 'projects', hint: 'everything else', run: jump('projects') },
      { name: 'experience', hint: 'where I’ve worked', run: jump('experience') },
      { name: 'memories', hint: 'away from the keyboard', run: jump('memories') },
      { name: 'contact', hint: 'say hello', run: jump('contact') },
      { name: 'writing', hint: 'notes on evals and agents', run: () => void (window.location.hash = '/blog') },
      { name: 'github', hint: 'github.com/jadenfix', run: () => void window.open(links.github, '_blank') },
      { name: 'linkedin', hint: 'linkedin.com/in/jadenfix', run: () => void window.open(links.linkedin, '_blank') },
      { name: 'whoami', hint: '', run: () => 'jaden fix. software engineer, san francisco.' },
      { name: 'sudo', hint: '', run: () => 'nice try.' },
    ],
    [],
  );

  const shown = cmds.filter((c) => c.name.startsWith(q.trim().toLowerCase()) && (c.hint || q.trim()));

  useEffect(() => {
    const openBar = () => {
      setQ('');
      setSel(0);
      setEcho('');
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (!open && e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        openBar();
      } else if (open && e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => openBar();
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-bar', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-bar', onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  const exec = (c?: Cmd) => {
    if (!c) return;
    const res = c.run();
    if (typeof res === 'string') setEcho(res);
    else setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-void/60 px-4 pt-[18vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-label="Navigate the page"
        >
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="w-full max-w-[520px] border border-line bg-panel shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px]">
              <span className="text-phos">›</span>
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                  setEcho('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') setSel((s) => Math.min(s + 1, shown.length - 1));
                  if (e.key === 'ArrowUp') setSel((s) => Math.max(s - 1, 0));
                  if (e.key === 'Enter') exec(shown[sel]);
                }}
                placeholder="where to?"
                className="w-full bg-transparent text-bone placeholder:text-faint focus:outline-none"
                aria-label="Command"
              />
              <span className="text-[10px] text-faint">esc</span>
            </div>
            {echo ? (
              <div className="px-4 py-4 text-[13px] text-dim">{echo}</div>
            ) : (
              <ul className="max-h-[50vh] overflow-auto py-1">
                {shown.map((c, i) => (
                  <li key={c.name}>
                    <button
                      onMouseEnter={() => setSel(i)}
                      onClick={() => exec(c)}
                      className={`flex w-full items-baseline justify-between px-4 py-2 text-left text-[13px] ${i === sel ? 'bg-void text-phos' : 'text-bone'}`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[11px] text-faint">{c.hint}</span>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="px-4 py-3 text-[12px] text-faint">command not found. try “work”.</li>}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
