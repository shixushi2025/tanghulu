/**
 * Patches dist/server/wrangler.json to pass CF Pages validation.
 * The @astrojs/cloudflare adapter generates fields for CF Workers
 * that are invalid in a CF Pages context.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const path = 'dist/server/wrangler.json';

if (!existsSync(path)) {
  console.log('fix-deploy: dist/server/wrangler.json not found, skipping');
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(path, 'utf8'));

// Pages does not support "main" alongside "pages_build_output_dir"
delete cfg.main;

// Pages does not support these fields at all
delete cfg.no_bundle;
delete cfg.rules;
delete cfg.dev;

// Remove extra top-level fields that cause "unexpected fields" warnings
const extraTopLevel = [
  'definedEnvironments', 'images', 'secrets_store_secrets',
  'unsafe_hello_world', 'worker_loaders', 'ratelimits',
  'vpc_services', 'python_modules',
  // internal adapter fields
  'configPath', 'userConfigPath', 'legacy_env',
  'jsx_factory', 'jsx_fragment',
];
for (const f of extraTopLevel) delete cfg[f];

// triggers must be { crons: [] }, not {}
if (cfg.triggers !== undefined) cfg.triggers = { crons: [] };

// Remove SESSION kv_namespace (auto-added by adapter, no id = invalid for Pages)
if (Array.isArray(cfg.kv_namespaces)) {
  cfg.kv_namespaces = cfg.kv_namespaces.filter(kv => kv.binding !== 'SESSION');
}

// Remove ASSETS binding (reserved name in CF Pages)
if (cfg.assets?.binding === 'ASSETS') delete cfg.assets;

writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('fix-deploy: patched dist/server/wrangler.json ✓');
