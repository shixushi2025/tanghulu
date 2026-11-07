/** Keep the Git-connected Pages artifact separate from native Worker output. */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist/pages', { recursive: true, force: true });
await mkdir('dist/pages', { recursive: true });
await cp('dist/client', 'dist/pages', { recursive: true });
await build({ entryPoints: ['dist/server/entry.mjs'], outfile: 'dist/pages/_worker.js', bundle: true, format: 'esm', platform: 'browser', conditions: ['workerd'], external: ['cloudflare:*', 'node:*'] });
await writeFile('dist/pages/_routes.json', JSON.stringify({ version: 1, include: ['/*'], exclude: ['/_astro/*', '/images/*', '/favicon.ico', '/favicon.svg', '/logo.svg', '/robots.txt', '/og.png'] }, null, 2) + '\n');
// Pages must read its root configuration, not the native Worker redirect.
await rm('.wrangler/deploy', { recursive: true, force: true });
console.log('Pages artifact: dist/pages; native Worker: dist/server/wrangler.json. Local D1 state preserved.');
