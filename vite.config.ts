import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages はサブパス配信のため相対 base
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 8192,
  },
  server: {
    host: true,
  },
});
