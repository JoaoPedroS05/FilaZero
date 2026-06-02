import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: []
      }
    }),
    tailwindcss()
  ],
  server: {
    port: 5173
  },
  test: {
    globals: true,         
    environment: 'jsdom',    
    setupFiles: ['./src/tests/setup.jsx'],
    transformMode: {
    web: [/\.[jt]sx?$/],
  },
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/main.jsx'],
    },
  },
});