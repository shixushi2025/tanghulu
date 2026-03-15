/**
 * Prepares dist/ for Cloudflare Pages advanced mode (_worker.js).
 *
 * CF Pages advanced mode requires _worker.js to be a single self-contained
 * bundle — it cannot resolve multi-file module imports at runtime.
 * So we use esbuild to bundle dist/server/entry.mjs → dist/_worker.js.
 */
import { cpSync, existsSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

// 1. Flatten dist/client/* → dist/ so static assets are at the correct URL paths
if (existsSync('dist/client')) {
  cpSync('dist/client', 'dist', { recursive: true });
  console.log('fix-deploy: dist/client/ → dist/ ✓');
}

// 2. Bundle the SSR worker into a single self-contained dist/_worker.js
const esbuild = resolve('node_modules/.bin/esbuild');
execFileSync(esbuild, [
  'dist/server/entry.mjs',
  '--bundle',
  '--outfile=dist/_worker.js',
  '--format=esm',
  '--platform=browser',
  '--conditions=workerd',
  '--external:cloudflare:*',
  '--external:node:*',
], { stdio: 'inherit' });
console.log('fix-deploy: dist/_worker.js bundled ✓');

// 3. Remove .wrangler/deploy redirect — use wrangler.toml directly
rmSync('.wrangler', { recursive: true, force: true });
console.log('fix-deploy: .wrangler/ removed ✓');
