import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1.1, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
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
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setN(text.length);
      onDone?.();
      return;
    }
    let i = 0;
    let timer: number;
    const start = window.setTimeout(function tick() {
      i += 1;
      setN(i);
      if (i < text.length) timer = window.setTimeout(tick, speed + (text[i - 1] === ' ' ? speed * 0.6 : 0));
      else onDone?.();
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  const done = n >= text.length;
  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="invisible">{text.slice(n)}</span>
      {cursor && (
        <span aria-hidden className={`ml-[2px] inline-block h-[0.95em] w-[0.5em] translate-y-[0.12em] bg-phos ${done ? 'animate-blink' : ''}`} />
      )}
    </span>
  );
}

export function SectionHead({ n, label, title, children }: { n: string; label: string; title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <div className="md:col-span-3">
        <div className="label">
          <span className="text-phos">{n}</span>
          <span className="mx-2 text-faint">·</span>
          {label}
        </div>
      </div>
      <div className="md:col-span-9">
        <h2 className="display text-[38px] leading-[1.08] sm:text-[52px]">
          <Typed text={title} speed={34} />
        </h2>
        {children && (
          <Reveal delay={0.3}>
            <div className="mt-5 max-w-[620px] text-[14px] leading-[1.85] text-dim">{children}</div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

export function Rule() {
  return <div className="dots my-24 sm:my-32" aria-hidden />;
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
      {name} <span className="text-faint">↗</span>
    </a>
  );
}
