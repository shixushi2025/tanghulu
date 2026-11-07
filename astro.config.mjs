// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  site: 'https://tanghulu.life',
  output: 'static',
  vite: {
    build: { assetsInlineLimit: 0 },
    plugins: [tailwindcss()],
    server: { proxy: { '/api': 'http://localhost:8787', '/random': 'http://localhost:8787' } },
  },
});
