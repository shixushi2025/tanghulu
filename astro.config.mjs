// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    configPath: './wrangler.worker.toml',
    imageService: 'passthrough',
    // Reuse the existing namespace; authentication uses signed cookies, not Astro sessions.
    sessionKVBindingName: 'TANGHULU_VIEWS',
  }),
  vite: {
    build: { assetsInlineLimit: 0 },
    plugins: [tailwindcss()],
  },
});
