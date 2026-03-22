/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        clan: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
          surface: '#222222',
          gold: '#eab308',
          'gold-dim': '#ca9a00',
          'gold-glow': '#fde047',
          red: '#ef4444',
          blue: '#3b82f6',
          green: '#22c55e',
          muted: '#6b7280',
          text: '#e5e5e5',
          'text-dim': '#a3a3a3',
        }
      },
      fontFamily: {
        display: ['"Rajdhani"', 'sans-serif'],
        body: ['"Barlow"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(234, 179, 8, 0.3)',
        'gold-sm': '0 0 10px rgba(234, 179, 8, 0.2)',
        card: '0 4px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(234,179,8,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(234,179,8,0.5)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        }
      }
    }
  },
  plugins: []
}
