/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // hover styles only where hover exists: a tap on a phone shouldn't leave things lit
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // the palette follows the time of day (src/palette.ts, written to :root by
      // src/theme.ts) as RGB triplets, so opacity modifiers like bg-phos/10 work
      colors: Object.fromEntries(
        ['void', 'panel', 'line', 'bone', 'dim', 'faint', 'phos', 'ice'].map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]),
      ),
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '1120px' },
      // the motion system's curves (see src/motion.ts); every transition-* utility defaults to crisp
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 1, 0.5, 1)',
        crisp: 'cubic-bezier(0.25, 1, 0.5, 1)',
        out: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        sweep: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: { DEFAULT: '180ms', micro: '180ms', short: '400ms', base: '700ms', slow: '1100ms' },
      keyframes: {
        breathe: { '0%,100%': { opacity: '0.35' }, '50%': { opacity: '0.9' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
      },
      animation: {
        breathe: 'breathe 4.5s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
