/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map Tailwind color tokens to CSS variables so a runtime theme
        // change (admin Theme Management) updates the entire app.
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          light: 'rgb(var(--brand-light) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
        },
        wellness: {
          DEFAULT: 'rgb(var(--wellness) / <alpha-value>)',
          light: 'rgb(var(--wellness-light) / <alpha-value>)',
          dark: 'rgb(var(--wellness-dark) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          alt: 'rgb(var(--surface-alt) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Editorial serif for headings — matches the Reconnct brand look.
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(0,0,0,0.1)',
        card: '0 8px 32px -12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
