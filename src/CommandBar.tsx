import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { links } from './content';
import { DUR, EASE } from './motion';
import { clockAt, partOfDay, positionAt } from './palette';
import { getTime, setTime } from './theme';

/** `deep` commands only appear once you start typing */
type Cmd = { name: string; hint: string; run: () => string | void; deep?: boolean };

/**
 * The page's palette follows the sun's height, which is the same at 9:00 as
 * at 15:00: a morning hour sets the afternoon it mirrors. Minutes past midnight.
 */
const solar = (m: number) => {
  const d = ((m % 1440) + 1440) % 1440;
  return d >= 720 ? d : 1440 - d;
};
const toTime = (m: number) => () => void setTime(positionAt(solar(m)), { sweep: true });
const TIMES: [string, string, number][] = [
  ['noon', 'paper white', 720],
  ['morning', 'rose, like the afternoon', 540],
  ['afternoon', 'rose', 900],
  ['sunset', 'the light turns', 1025],
  ['dusk', 'red', 1080],
  ['night', 'deep red', 1260],
  ['midnight', 'black, the default', 1440],
];

/** "time 21:30", "time 9", "time 7:15pm" → minutes past midnight */
function parseClock(q: string): number | null {
  const m = q.match(/^time\s+(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 24 || min > 59) return null;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

const sfMinutes = () => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Los_Angeles' })
    .format(new Date())
    .split(':')
    .map(Number);
  return h * 60 + m;
};

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
      { name: 'projects', hint: 'things I’ve built', run: jump('projects') },
      { name: 'simulation', hint: 'does the world render when nobody’s looking?', run: () => void (window.location.hash = '/simulation') },
      { name: 'experience', hint: 'where I’ve worked', run: jump('experience') },
      { name: 'memories', hint: 'away from the keyboard', run: jump('memories') },
      { name: 'contact', hint: 'say hello', run: jump('contact') },
      { name: 'writing', hint: 'notes on evals and agents', run: () => void (window.location.hash = '/blog') },
      { name: 'github', hint: 'github.com/jadenfix', run: () => void window.open(links.github, '_blank') },
      { name: 'linkedin', hint: 'linkedin.com/in/jadenfix', run: () => void window.open(links.linkedin, '_blank') },
      {
        name: 'time',
        hint: 'set the hour: noon is light, midnight dark',
        run: () => {
          const p = getTime();
          return `it's ${clockAt(p)} here, ${partOfDay(p)}. try time noon, time dusk, time 21:30, time now (san francisco's hour), or drag the sun in the header.`;
        },
      },
      ...TIMES.map(([name, hint, m]): Cmd => ({ name: `time ${name}`, hint, run: toTime(m), deep: true })),
      { name: 'time now', hint: 'the hour in san francisco', run: () => toTime(sfMinutes())(), deep: true },
      { name: 'whoami', hint: '', run: () => 'jaden fix. software engineer, san francisco.' },
      { name: 'sudo', hint: '', run: () => 'nice try.' },
    ],
    [],
  );

  const query = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const at = parseClock(query);
  const shown: Cmd[] =
    at !== null
      ? [{ name: query, hint: `set the page to ${String(Math.floor(solar(at) / 60) % 24).padStart(2, '0')}:${String(solar(at) % 60).padStart(2, '0')}`, run: toTime(at) }]
      : cmds.filter((c) => c.name.startsWith(query) && (query ? !c.deep || query.length >= 2 : c.hint && !c.deep));

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
          transition={{ duration: DUR.micro + 0.07 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-label="Navigate the page"
        >
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ duration: DUR.short, ease: EASE.crisp }}
            className="w-full max-w-[520px] border border-line bg-panel shadow-[0_30px_80px_-30px_rgb(var(--c-shadow)/var(--shadow-a))]"
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
                {shown.length === 0 && <li className="px-4 py-3 text-[12px] text-faint">command not found. try “research”.</li>}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
