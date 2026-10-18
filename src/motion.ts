// The motion system. Every duration, curve and glyph set the site moves with
// lives here (and is mirrored as CSS custom properties in index.css and as
// Tailwind's default transition timing). Nothing moves fast, nothing bounces.

type Bezier = [number, number, number, number];

export const EASE = {
  /** the house curve: a long, calm settle */
  out: [0.2, 0.7, 0.2, 1] as Bezier,
  /** hover and press responses: quick off the mark, soft landing */
  crisp: [0.25, 1, 0.5, 1] as Bezier,
  /** wipes and sweeps that cross the screen */
  sweep: [0.65, 0, 0.35, 1] as Bezier,
};

/** seconds */
export const DUR = {
  micro: 0.18,
  short: 0.4,
  base: 0.7,
  slow: 1.1,
  develop: 2.6,
};

/** seconds between siblings that enter together */
export const STAGGER = 0.07;

/** how often scrambling glyphs change, in ms; slower than the frame rate on purpose */
export const GLYPH_TICK = 55;

/** the characters things decode from: the same ramp the black hole is drawn in */
export const GLYPHS = '·:-=+*#%░▒';

export const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export const cssEase = (b: Bezier) => `cubic-bezier(${b.join(',')})`;

const rmq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reducedMotion = () => !!rmq?.matches;

const fine = typeof window !== 'undefined' ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
/** true on devices with a real hover state (not touch) */
export const canHover = () => !!fine?.matches;
