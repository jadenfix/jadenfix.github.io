/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0b0b0a',
        panel: '#121211',
        line: '#252421',
        bone: '#dcd6c8',
        dim: '#8d887c',
        faint: '#58554e',
        phos: '#e8a96a',
        ice: '#c4ccde',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '1120px' },
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
