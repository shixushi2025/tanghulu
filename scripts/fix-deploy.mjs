/**
 * Prepares the dist/ directory for Cloudflare Pages advanced mode deployment.
 *
 * CF Pages advanced mode: place _worker.js at the root of pages_build_output_dir.
 * CF Pages automatically detects it and routes all non-static requests through it.
 *
 * Steps:
 * 1. Flatten dist/client/* → dist/* so static assets are at the correct URL paths
 * 2. Create dist/_worker.js that re-exports the Astro SSR handler
 * 3. Remove .wrangler/deploy redirect (we use wrangler.toml directly, no main field)
 */
import { cpSync, writeFileSync, existsSync, rmSync } from 'fs';

// 1. Flatten static assets so /_astro/*, /favicon.svg etc. are served correctly
if (existsSync('dist/client')) {
  cpSync('dist/client', 'dist', { recursive: true });
  console.log('fix-deploy: dist/client/ → dist/ ✓');
}

// 2. Create _worker.js — CF Pages detects this automatically in pages_build_output_dir
writeFileSync('dist/_worker.js', [
  '// Auto-generated: Astro SSR handler for Cloudflare Pages',
  "export { default } from './server/entry.mjs';",
  "export * from './server/entry.mjs';",
].join('\n') + '\n');
console.log('fix-deploy: dist/_worker.js created ✓');

// 3. Remove adapter-generated .wrangler/deploy redirect to avoid config conflicts
rmSync('.wrangler', { recursive: true, force: true });
console.log('fix-deploy: .wrangler/ removed ✓');
