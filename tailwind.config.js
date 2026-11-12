/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#06060f',
          900: '#0a0a18',
          850: '#0d0d1c',
          800: '#11111e',
          750: '#141423',
          700: '#1a1a2e',
          600: '#22223a',
          500: '#2a2a45',
          400: '#353552',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
          dark: '#6d28d9',
          secondary: '#6366f1',
          glow: 'rgba(124, 58, 237, 0.3)',
        },
        content: {
          primary: '#f0f0ff',
          secondary: '#a0a0c0',
          muted: '#606080',
          dim: '#404060',
        },
        success: {
          DEFAULT: '#22c55e',
          dim: 'rgba(34, 197, 94, 0.15)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245, 158, 11, 0.15)',
        },
        danger: {
          DEFAULT: '#ef4444',
          dim: 'rgba(239, 68, 68, 0.15)',
        },
        info: {
          DEFAULT: '#3b82f6',
          dim: 'rgba(59, 130, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
        pill: '24px',
        input: '8px',
        xl2: '20px',
      },
      backdropBlur: {
        glass: '24px',
        'glass-elevated': '32px',
        xs: '4px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'accent': '0 0 24px rgba(124, 58, 237, 0.4)',
        'accent-sm': '0 0 12px rgba(124, 58, 237, 0.25)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up': 'fadeInUp 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        xs: '375px',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      height: {
        'screen-dvh': '100dvh',
        'nav': '72px',
      },
      minHeight: {
        'screen-dvh': '100dvh',
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      zIndex: {
        'nav': '50',
        'modal': '60',
        'toast': '70',
        'overlay': '55',
      },
    },
  },
  plugins: [],
}
