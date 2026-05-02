/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          deep:    '#0e1117',
          base:    '#171d25',
          panel:   '#1e2530',
          surface: '#252d38',
          hover:   '#2a3444',
          active:  '#1a9fff18',
        },
        accent:  '#1a9fff',
        shout:   '#e8652a',
        success: '#4db35e',
        text: {
          hi:  '#e8eaed',
          md:  '#a0aab8',
          lo:  '#5a6478',
        },
        border: {
          lo: '#ffffff0f',
          md: '#ffffff18',
        }
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        'input': '4px',
        'card':  '8px',
        'modal': '12px',
      },
      transitionDuration: { 150: '150ms' },
      transitionTimingFunction: { ease: 'ease' },
      ringColor: { DEFAULT: 'rgba(26, 159, 255, 0.4)' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
