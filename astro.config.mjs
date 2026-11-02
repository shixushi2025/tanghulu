// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/** Rewrite dynamic public/admin URLs in `astro dev` / `astro preview` (Pages uses public/_redirects). */
function spaFallback() {
  /** @param {string} url */
  function rewrite(url) {
    const [path, query] = url.split('?');
    const q = query ? `?${query}` : '';
    if (/^\/item\/[A-Za-z0-9_-]+\/?$/.test(path)) return `/item/${q}`;
    if (/^\/admin\/items\/[A-Za-z0-9_-]+\/edit\/?$/.test(path)) return `/admin/edit${q}`;
    return url;
  }

  /** @param {import('vite').ViteDevServer} server */
  function attach(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url) {
        const nextUrl = rewrite(req.url);
        if (nextUrl !== req.url) req.url = nextUrl;
      }
      next();
    });
  }

  return {
    name: 'tanghulu-spa-fallback',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://tanghulu.life',
  output: 'static',
  vite: {
    plugins: [tailwindcss(), spaFallback()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
  },
});
