import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GLYPHS, GLYPH_TICK, reducedMotion } from './motion';
import { useEntered, useReveal } from './scroll';

/**
 * Fades and lifts its children into place the first time they scroll into
 * view. Pure CSS transitions, timed by the shared reveal cohort (see scroll.ts),
 * so siblings that arrive together enter in reading order.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  from = 'below',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  from?: 'below' | 'left' | 'none';
  as?: 'div' | 'li';
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  useReveal(ref, delay);
  return (
    <Tag ref={ref} className={`reveal ${className}`} data-from={from === 'below' ? undefined : from}>
      {children}
    </Tag>
  );
}

// ------------------------------------------------------------------ decoding text
const hash = (i: number, k: number) => {
  let h = Math.imul(i * 374761393 + k * 668265263, 1274126177);
  h ^= h >>> 15;
  return (h >>> 0) % 9973;
};

/**
 * Drives a left-to-right decode: `n` characters resolved so far and a `tick`
 * that changes every GLYPH_TICK ms (so glyphs shimmer at a calm rate, not the
 * frame rate). Runs on requestAnimationFrame only while decoding.
 */
function useDecode(len: number, startIn: number | null, perChar: number, tail = 6) {
  const [state, setState] = useState({ n: 0, tick: 0, done: false });
  useEffect(() => {
    if (startIn === null || state.done) return;
    if (reducedMotion()) {
      setState({ n: len, tick: 0, done: true });
      return;
    }
    let raf = 0;
    let last = 0;
    let t0 = 0;
    const total = (len + tail) * perChar;
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const e = now - t0;
      if (e >= total) {
        setState({ n: len, tick: 0, done: true });
        return;
      }
      if (now - last >= GLYPH_TICK) {
        last = now;
        setState({ n: Math.max(0, Math.floor(e / perChar) - tail), tick: Math.floor(e / GLYPH_TICK), done: false });
      }
      raf = requestAnimationFrame(frame);
    };
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(frame)), startIn * 1000);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIn, len, perChar]);
  return state;
}

/**
 * Text that resolves out of glyphs, left to right, when it enters the view.
 * Each unresolved letter keeps its real width (it's laid out invisibly with a
 * glyph drawn over it), so the line never reflows while it decodes.
 */
export function Decode({ text, delay = 0, className = '', speed }: { text: string; delay?: number; className?: string; speed?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const at = useEntered(ref, delay);
  // long headings decode a little faster, so none takes much more than a second
  const perChar = speed ?? Math.min(30, 1000 / Math.max(1, text.length));
  const { n, tick, done } = useDecode(text.length, at, perChar);
  if (done) return <span ref={ref} className={className}>{text}</span>;
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, n)}
        {text
          .slice(n)
          .split('')
          .map((ch, j) => {
            const i = n + j;
            if (ch === ' ') return ' ';
            const head = at !== null && j < 6;
            // the leading edge shimmers every tick, the rest of the line drifts slowly
            const g = GLYPHS[hash(i, head ? tick : Math.floor(tick / 5)) % GLYPHS.length];
            return (
              <span key={i} className="relative">
                <span className="invisible">{ch}</span>
                <span className={`decode-glyph ${head ? 'text-phos' : 'text-faint'}`}>{g}</span>
              </span>
            );
          })}
      </span>
    </span>
  );
}

/**
 * A numeric readout that acquires its value: digits flicker, then lock in
 * from the left, like an instrument settling. Non-digits stay put.
 */
export function Readout({ value, delay = 0, className = '' }: { value: string; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const at = useEntered(ref, delay);
  const { n, tick, done } = useDecode(value.length, at, 70, 4);
  const shown = done
    ? value
    : value
        .split('')
        .map((ch, i) => (i < n || !/\d/.test(ch) ? ch : String(hash(i, tick) % 10)))
        .join('');
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

/** Types its text out once, slowly, when it scrolls into view. */
export function Typed({
  text,
  speed = 38,
  delay = 0,
  cursor = false,
  className = '',
  onDone,
}: {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const at = useEntered(ref);
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (at === null) return;
    if (reducedMotion()) {
      setN(text.length);
      done.current?.();
      return;
    }
    // when each character lands: a beat longer after a space, like a hand typing
    const times: number[] = [];
    let acc = 0;
    for (let i = 0; i < text.length; i++) {
      acc += speed + (i > 0 && text[i - 1] === ' ' ? speed * 0.6 : 0);
      times.push(acc);
    }
    let raf = 0;
    let t0 = 0;
    let shown = 0;
    const frame = (now: number) => {
      if (!t0) t0 = now;
      const e = now - t0;
      let k = shown;
      while (k < times.length && times[k] <= e) k++;
      if (k !== shown) {
        shown = k;
        setN(k);
      }
      if (k < text.length) raf = requestAnimationFrame(frame);
      else done.current?.();
    };
    const timer = window.setTimeout(() => (raf = requestAnimationFrame(frame)), delay + at * 1000);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  const complete = n >= text.length;
  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="invisible">{text.slice(n)}</span>
      {cursor && (
        <span aria-hidden className={`ml-[2px] inline-block h-[0.95em] w-[0.5em] translate-y-[0.12em] bg-phos ${complete ? 'animate-blink' : ''}`} />
      )}
    </span>
  );
}

export function SectionHead({ n, label, title, children }: { n: string; label: string; title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <div className="md:col-span-3">
        <Reveal from="left" className="label">
          <Readout value={n} className="text-phos" />
          <span className="mx-2 text-faint">·</span>
          {label}
        </Reveal>
      </div>
      <div className="md:col-span-9">
        <h2 className="display text-[38px] leading-[1.08] sm:text-[52px]">
          <Decode text={title} delay={0.12} />
        </h2>
        {children && (
          <Reveal delay={0.45}>
            <div className="mt-5 max-w-[620px] text-[14px] leading-[1.85] text-dim">{children}</div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

/** The dotted section rule; a phosphor print head draws it across as it arrives. */
export function Rule() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref} className="rule my-24 sm:my-32" aria-hidden>
      <div className="dots" />
    </div>
  );
}

export function Figure({ children, caption, href, hrefLabel }: { children: ReactNode; caption: string; href?: string; hrefLabel?: string }) {
  return (
    <figure>
      <div className="overflow-hidden border border-line bg-black">{children}</div>
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="label">{caption}</span>
        {href && (
          <a className="label link-u" href={href} target="_blank" rel="noreferrer">
            {hrefLabel ?? 'source'} ↗
          </a>
        )}
      </figcaption>
    </figure>
  );
}

export function Chip({ name, href }: { name: string; href?: string }) {
  if (!href) return <span className="chip border-dashed text-dim">{name}</span>;
  return (
    <a className="chip" href={href} target="_blank" rel="noreferrer">
      {name} <span className="chip-arrow text-faint">↗</span>
    </a>
  );
}

/**
 * A two-column strip above a demo: what to do with it, and what it shows.
 * Always open from md up; on phones it folds behind a small toggle.
 */
export function DemoNote({ how, reveals }: { how: string; reveals: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 border-y border-line/70 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="label flex w-full items-center justify-between text-left md:hidden"
      >
        <span>
          <span className="text-phos">how</span> · what it shows
        </span>
        <span aria-hidden className={`inline-block text-faint transition-transform duration-short ${open ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>
      <dl className={`${open ? 'grid' : 'hidden'} mt-3 gap-x-8 gap-y-3 text-[12px] leading-[1.75] md:mt-0 md:grid md:grid-cols-2`}>
        <div className="flex gap-3">
          <dt className="label w-[52px] shrink-0 pt-px text-phos">how</dt>
          <dd className="text-dim">{how}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="label w-[52px] shrink-0 pt-px text-phos">reveals</dt>
          <dd className="text-dim">{reveals}</dd>
        </div>
      </dl>
    </div>
  );
}
