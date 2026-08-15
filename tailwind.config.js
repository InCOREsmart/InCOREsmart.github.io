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
          DEFAULT: '#000052',
          dark: '#14147a',
          light: '#46618C',
        },
        error: {
          DEFAULT: '#B8860B',
          dark: '#8A6508',
          light: '#D4A017',
        },
        green: {
          50: '#f0f0fa',
          100: '#f0f0fa',
          400: '#46618C',
          500: '#46618C',
          600: '#000052',
          700: '#000052',
          800: '#000052',
          900: '#000038',
        },
        emerald: {
          50: '#f0f0fa',
          100: '#f0f0fa',
          400: '#46618C',
          500: '#46618C',
          600: '#000052',
          700: '#000052',
          800: '#000052',
          900: '#000038',
        },
        red: {
          50: '#faf3e0',
          100: '#faf3e0',
          200: '#d4a017',
          400: '#d4a017',
          500: '#B8860B',
          600: '#B8860B',
          700: '#8A6508',
          800: '#8A6508',
          900: '#8A6508',
        },
        rose: {
          50: '#faf3e0',
          100: '#faf3e0',
          200: '#d4a017',
          400: '#d4a017',
          500: '#B8860B',
          600: '#B8860B',
          700: '#8A6508',
          800: '#8A6508',
          900: '#8A6508',
        },
        text: {
          primary: '#ffffff',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
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
