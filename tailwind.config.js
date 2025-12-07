/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // SF Bay Area Theme
                'golden-gate': '#C0362C',
                'golden-gate-dark': '#9d2b23',
                'fog-light': '#cfd8dc',
                'fog-medium': '#90a4ae',
                'fog-dark': '#607d8b',
                'sf-blue': '#1a365d',
                'sf-blue-light': '#2c5282',
                'sf-teal': '#234e52',
                // Dark Theme Base (Matteo-inspired)
                'bg-primary': '#0d1117',
                'bg-secondary': '#161b22',
                'bg-tertiary': '#21262d',
                'text-primary': '#f0f6fc',
                'text-secondary': '#8b949e',
                'text-muted': '#6e7681',
                'accent-primary': '#63b3ed',
                'accent-secondary': '#4fd1c5',
                'border-color': 'rgba(99, 179, 237, 0.15)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            borderRadius: {
                'none': '0',
                'sm': '0',
                'md': '0',
                'lg': '0',
                'xl': '0',
                '2xl': '0',
                '3xl': '0',
                'full': '9999px', // Keep full for circles
            },
            backgroundImage: {
                'gradient-orb-1': 'radial-gradient(circle, #1a365d 0%, transparent 70%)',
                'gradient-orb-2': 'radial-gradient(circle, #234e52 0%, transparent 70%)',
                'gradient-golden': 'linear-gradient(135deg, #C0362C, #9d2b23)',
                'gradient-accent': 'linear-gradient(135deg, #63b3ed, #4fd1c5)',
            },
            animation: {
                'float': 'float 20s ease-in-out infinite',
                'float-reverse': 'float 25s ease-in-out infinite reverse',
                'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
                'blink': 'blink 1s step-end infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            backdropFilter: {
                'none': 'none',
                'blur': 'blur(20px)',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
                    '25%': { transform: 'translate(30px, -30px) rotate(5deg)' },
                    '50%': { transform: 'translate(-20px, 20px) rotate(-5deg)' },
                    '75%': { transform: 'translate(20px, 30px) rotate(3deg)' },
                },
                'pulse-dot': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.5', transform: 'scale(1.2)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
            },
        },
    },
    plugins: [
        function ({ addUtilities }) {
            const newUtilities = {
                '.clip-corner-tl': {
                    'clip-path': 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)',
                },
                '.clip-corner-br': {
                    'clip-path': 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
                },
                '.clip-diagonal': {
                    'clip-path': 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
                },
                '.clip-chevron': {
                    'clip-path': 'polygon(100% 0, 100% 50%, 100% 100%, 0% 100%, 10% 50%, 0% 0%)',
                },
            }
            addUtilities(newUtilities)
        }
    ],
}
