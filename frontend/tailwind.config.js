/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        ec: {
          bg:      '#070B14',
          surface: '#0D1526',
          glass:   'rgba(13, 21, 38, 0.6)',
          blue:    '#3B82F6',
          protein: '#60A5FA',   // electric-blue – protein
          carbs:   '#4ADE80',   // green – carbs
          fat:     '#FBBF24',   // amber – fat / calories
          alert:   '#F87171',   // red – critical health alerts
          border:  'rgba(255, 255, 255, 0.08)',
          text:    '#E2E8F0',
          muted:   '#64748B',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0'  },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0)' },
        },
      },
      animation: {
        shimmer:    'shimmer 1.6s infinite linear',
        fadeUp:     'fadeUp 0.5s ease-out forwards',
        pulseGlow:  'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
