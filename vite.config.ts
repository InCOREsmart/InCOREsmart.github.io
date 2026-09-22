import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        marketValue: resolve(import.meta.dirname, 'tools/market-value/index.html'),
        hrCalculator: resolve(import.meta.dirname, 'tools/hr-calculator/index.html'),
      },
    },
  },
});