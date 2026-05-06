/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#06070b',
          900: '#0a0c14',
          800: '#11141d',
          700: '#1a1f2e',
          600: '#252b3d',
        },
        neon: {
          violet: '#8b5cf6',
          indigo: '#6366f1',
          cyan: '#22d3ee',
          pink: '#ec4899',
          lime: '#a3e635',
        },
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse at top, rgba(139,92,246,0.15), transparent 60%), radial-gradient(ellipse at bottom right, rgba(34,211,238,0.10), transparent 60%)',
        'aurora':
          'linear-gradient(135deg, rgba(139,92,246,0.20) 0%, rgba(99,102,241,0.10) 30%, rgba(34,211,238,0.15) 70%, rgba(236,72,153,0.10) 100%)',
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 40px -10px rgba(34, 211, 238, 0.4)',
        soft: '0 4px 30px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-x': 'gradientX 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
