/**
 * Patches the adapter-generated dist/server/wrangler.json to fix
 * Cloudflare Pages validation errors before deployment.
 *
 * Errors fixed:
 *   - triggers: {} → { crons: [] }  (Pages requires this exact shape)
 *   - SESSION kv_namespace has no id → removed (we don't use Astro sessions)
 *   - assets.binding = "ASSETS" → removed (name is reserved in Pages)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const path = 'dist/server/wrangler.json';

if (!existsSync(path)) {
  console.log('fix-deploy: dist/server/wrangler.json not found, skipping');
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(path, 'utf8'));

// triggers must be { crons: [] }, not {}
if (cfg.triggers !== undefined) {
  cfg.triggers = { crons: [] };
}

// Remove SESSION kv_namespace (auto-added by adapter, no id = invalid)
if (Array.isArray(cfg.kv_namespaces)) {
  cfg.kv_namespaces = cfg.kv_namespaces.filter(kv => kv.binding !== 'SESSION');
}

// Remove ASSETS binding (reserved name in CF Pages)
if (cfg.assets?.binding === 'ASSETS') {
  delete cfg.assets;
}

writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('fix-deploy: patched dist/server/wrangler.json ✓');
