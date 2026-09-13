/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './options.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Default style guide: black / white / gray / bright green (highlight only).
    // Status colours are text-only.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      gray: {
        DEFAULT: '#6B7280',
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        500: '#6B7280',
        700: '#374151',
      },
      green: '#22C55E',
      danger: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
    fontFamily: {
      display: ['"Bricolage Grotesque Variable"', 'sans-serif'],
      sans: ['"IBM Plex Sans"', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    extend: {
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px -4px rgba(0,0,0,0.08)',
        lift: '0 8px 24px -8px rgba(0,0,0,0.18)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      },
      animation: {
        rise: 'rise 420ms cubic-bezier(.2,.7,.2,1) both',
        pulseDot: 'pulseDot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
