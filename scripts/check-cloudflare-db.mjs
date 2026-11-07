/** Read-only release gate: never publish a Worker against an incompatible D1 schema. */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const inCloudflareBuild = process.env.WORKERS_CI === '1' || process.env.WORKERS_CI === 'true' || process.env.CF_PAGES === '1';
const local = args.includes('--local');
const remote = args.includes('--remote');
const configIndex = args.indexOf('--config');
const config = configIndex >= 0 ? args[configIndex + 1] : 'wrangler.toml';
if (!config || config.startsWith('--') || (local && remote) || args.some(arg => !['--local', '--remote', '--config', config].includes(arg))) throw new Error('Usage: node scripts/check-cloudflare-db.mjs [--local|--remote] [--config wrangler.toml]');
if (!local && !remote && !inCloudflareBuild) {
  console.log('Local build: remote D1 check skipped. Cloudflare Builds checks it before publishing.');
  process.exit(0);
}
const result = spawnSync(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'TANGHULU_DB', '--config', resolve(config), local ? '--local' : '--remote', '--json', '--command', "SELECT name FROM sqlite_master WHERE type='table'; PRAGMA table_info(items);"], { encoding: 'utf8', env: { ...process.env, CI: '1' }, maxBuffer: 1024 * 1024 });
if (result.status !== 0) {
  console.error('D1 release check failed. Verify Cloudflare authentication and D1 read permission; no database changes were made.');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
const rows = JSON.parse(result.stdout).flatMap(query => query.results ?? []);
const tables = new Set(rows.filter(row => !Object.hasOwn(row, 'cid')).map(row => row.name));
const columns = new Set(rows.filter(row => Object.hasOwn(row, 'cid')).map(row => row.name));
const missing = ['items', 'ratings', 'rate_limits', 'view_totals', 'view_events'].filter(name => !tables.has(name));
if (!columns.has('featured')) missing.push('items.featured');
if (missing.length) {
  console.error(`D1 schema is not ready: ${missing.join(', ')}. Release stopped; existing deployment is unchanged.`);
  console.error('Back up and upgrade schema with: npm run db:upgrade -- --remote --phase schema');
  process.exit(1);
}
console.log('D1 schema is compatible. Read-only release check passed.');
