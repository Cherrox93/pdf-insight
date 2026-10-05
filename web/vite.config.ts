import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// GitHub Pages serwuje aplikację pod https://cherrox93.github.io/pdf-insight/
export default defineConfig({
  base: '/pdf-insight/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
});
