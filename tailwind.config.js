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
        // Crisper, layered card shadow — a tight edge shadow for definition
        // plus a soft ambient one for depth.
        soft: '0 1px 2px rgba(16,24,40,0.05), 0 6px 24px -10px rgba(16,24,40,0.12)',
        card: '0 2px 6px rgba(16,24,40,0.06), 0 14px 40px -14px rgba(16,24,40,0.18)',
      },
    },
  },
  plugins: [],
};
