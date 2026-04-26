/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0f2240', mid: '#1a3a5c', light: '#2a5298' },
        teal: { DEFAULT: '#0d9488', light: '#14b8a6' },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'form': '0 0 0 1px rgb(0 0 0 / 0.05), 0 4px 24px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
