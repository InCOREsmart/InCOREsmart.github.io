/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a2744',
          dark: '#151d30',
          light: '#243456',
        },
        card: '#243456',
        gold: {
          DEFAULT: '#c9a961',
          dark: '#b89940',
          light: '#d4b87a',
        },
        orange: {
          DEFAULT: '#ff6b35',
          dark: '#e55a28',
          light: '#ff8555',
        },
        success: {
          DEFAULT: '#4ade80',
          dark: '#22c55e',
          light: '#86efac',
        },
        error: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          light: '#f87171',
        },
        text: {
          primary: '#ffffff',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        button: '8px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
    },
  },
  plugins: [],
};
