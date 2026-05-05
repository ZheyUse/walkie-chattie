/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Host Grotesk', 'sans-serif'],
        title: ['ZCOOL XiaoWei', 'serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        bg: {
          deep:    '#0a0e1a',
          base:    '#0e1220',
          panel:   '#131929',
          surface: '#1a2235',
          hover:   '#1f2a40',
          active:  '#1a9fff18',
        },
        accent: {
          blue:    '#1a9fff',
          purple:  '#8b5cf6',
          DEFAULT: '#1a9fff',
        },
        shout:   '#e8652a',
        whisper: '#a78bfa',
        success: '#4db35e',
        text: {
          hi:  '#e8eaed',
          md:  '#a0aab8',
          lo:  '#5a6478',
        },
        border: {
          lo: '#ffffff10',
          md: '#ffffff18',
          hi: '#ffffff24',
        },
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        'input': '8px',
        'card':  '12px',
        'modal': '16px',
        'pill':  '9999px',
      },
      boxShadow: {
        'glow-blue':   '0 0 16px 0 rgba(26, 159, 255, 0.35)',
        'glow-purple': '0 0 16px 0 rgba(139, 92, 246, 0.35)',
        'glow-sm':     '0 0 8px 0 rgba(139, 92, 246, 0.25)',
        'surface':     '0 4px 24px 0 rgba(0, 0, 0, 0.4)',
        'card':        '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'orb':         '0 0 20px 0',
      },
      backgroundImage: {
        'space-radial': 'radial-gradient(ellipse at 20% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(26, 159, 255, 0.08) 0%, transparent 60%)',
        'orb-blue':    'linear-gradient(135deg, #1a9fff 0%, #0f6fd4 100%)',
        'orb-purple':  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        'orb-mixed':   'linear-gradient(135deg, #1a9fff 0%, #8b5cf6 100%)',
        'glass':       'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'glass-border':'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
      },
      animation: {
        'pulse-glow':  'pulseGlow 2.5s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'orb-enter':   'orbEnter 0.3s ease-out forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%':       { opacity: '0.7', filter: 'brightness(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        orbEnter: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionDuration: { 150: '150ms', 200: '200ms', 300: '300ms', 400: '400ms' },
      transitionTimingFunction: { ease: 'ease', spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      ringColor: { DEFAULT: 'rgba(26, 159, 255, 0.4)', purple: 'rgba(139, 92, 246, 0.4)' },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}