/** Explicit D1 upgrades for existing installations, including manually seeded databases. */
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const [action, ...args] = process.argv.slice(2);
const remote = args.includes('--remote');
const local = args.includes('--local');
const phaseIndex = args.indexOf('--phase');
const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : 'all';
if (!['all', 'schema', 'content'].includes(phase)) throw new Error('--phase must be schema, content, or all');
const configIndex = args.indexOf('--config');
const configPath = configIndex >= 0 ? args[configIndex + 1] : 'wrangler.toml';
if (!['status', 'upgrade'].includes(action) || remote === local || !configPath || configPath.startsWith('--')) {
  throw new Error('Usage: node scripts/db-release.mjs status|upgrade --local|--remote [--config wrangler.toml] [--phase schema|content|all]');
}
const accepted = new Set(['--remote', '--local', '--config', configPath, '--phase', phase]);
if (args.some(arg => !accepted.has(arg))) throw new Error('Unknown argument');
const target = [remote ? '--remote' : '--local'];
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
const upgrades = ['0004_featured.sql', '0004_security_metrics.sql', '0005_editorial_content.sql', '0006_content_refresh.sql', '0007_content_images.sql'];
function cli(command, json = false) {
  const result = spawnSync(process.execPath, [wrangler, 'd1', ...command, '--config', resolve(configPath), ...target, ...(json ? ['--json'] : [])], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, CI: '1' } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'Wrangler failed');
  return json ? JSON.parse(result.stdout) : result.stdout;
}
function query(sql) {
  return cli(['execute', 'TANGHULU_DB', '--command', sql], true).flatMap(result => result.results ?? []);
}
function status() {
  return query("SELECT COUNT(*) AS items, SUM(CASE WHEN cover <> '' THEN 1 ELSE 0 END) AS with_cover FROM items")[0];
}
const tableNames = new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(row => row.name));
if (!tableNames.has('items') || !tableNames.has('ratings')) throw new Error('This is not an initialized database. For a confirmed empty database, use the full migrations workflow documented in DEPLOYMENT.md.');
const itemColumns = new Set(query('PRAGMA table_info(items)').map(row => row.name));
const ratingColumns = new Set(query('PRAGMA table_info(ratings)').map(row => row.name));
if (!['id','title','category','tags','summary','cover','date','link','mood','country','body','updated_at'].every(column => itemColumns.has(column)) || !['id','item_id','score','fingerprint'].every(column => ratingColumns.has(column))) throw new Error('Unexpected database schema; inspect before upgrading.');
const completed = new Map(tableNames.has('tanghulu_release_migrations') ? query('SELECT name, sha256 FROM tanghulu_release_migrations').map(row => [row.name, row.sha256]) : []);
const unapplied = upgrades.flatMap(name => {
  const sql = readFileSync(`migrations/${name}`, 'utf8');
  const sha256 = createHash('sha256').update(sql).digest('hex');
  if (completed.has(name) && completed.get(name) !== sha256) throw new Error(`Previously applied migration changed: ${name}`);
  // Existing main installations may already have this non-idempotent ALTER.
  // Adopt it without resetting any manually selected featured items.
  const appliedSql = name === '0004_featured.sql' && itemColumns.has('featured') ? '' : sql;
  return completed.has(name) ? [] : [{ name, sql: appliedSql, sha256 }];
});
const pending = unapplied.filter(entry => phase === 'all' || (phase === 'schema' ? entry.name.startsWith('0004_') : !entry.name.startsWith('0004_')));
if (action === 'upgrade' && phase === 'content' && !(['rate_limits', 'view_totals', 'view_events'].every(name => tableNames.has(name)) && itemColumns.has('featured'))) throw new Error('Apply the schema phase before upgrading content.');
console.log(JSON.stringify({ phase, target: remote ? 'remote' : 'local', ...status(), hasFeaturedColumn: itemColumns.has('featured'), pending: pending.map(entry => entry.name) }, null, 2));
if (action === 'upgrade' && pending.length) {
  mkdirSync('.backups', { recursive: true, mode: 0o700 });
  const backup = resolve('.backups', `${remote ? 'remote' : 'local'}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.sql`);
  // If export fails, no migration is attempted.
  cli(['export', 'TANGHULU_DB', '--output', backup]);
  chmodSync(backup, 0o600);
  console.log(`Database backup saved: ${backup}`);
  const temporary = mkdtempSync(join(tmpdir(), 'tanghulu-upgrades-'));
  try {
    for (const entry of pending) {
      const path = join(temporary, entry.name);
      const record = `\nINSERT INTO tanghulu_release_migrations(name,sha256) VALUES ('${entry.name}','${entry.sha256}');\n`;
      writeFileSync(path, 'CREATE TABLE IF NOT EXISTS tanghulu_release_migrations(name TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);\n' + entry.sql + record, { mode: 0o600 });
      cli(['execute', 'TANGHULU_DB', '--file', path]);
      console.log(`Applied ${entry.name}`);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  console.log(JSON.stringify({ result: 'upgraded', ...status() }));
}
