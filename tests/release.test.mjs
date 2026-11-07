import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

test('已有 D1 分阶段升级：备份、保留后台编辑与 featured、匿名化评分、重复执行无变化', { timeout: 180000 }, () => {
  const state = mkdtempSync(join(tmpdir(), 'tanghulu-release-test-'));
  const config = join(state, 'wrangler.toml');
  writeFileSync(config, readFileSync('wrangler.toml'));
  const initialBackups = new Set((existsSync('.backups') ? readdirSync('.backups') : []));
  const run = args => execFileSync(process.execPath, args, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, CI: '1' }, maxBuffer: 8 * 1024 * 1024 });
  const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
  const query = sql => JSON.parse(run([wrangler, 'd1', 'execute', 'tanghulu-db', '--config', config, '--local', '--command', sql, '--json'])).flatMap(result => result.results);
  const release = (...args) => run(['scripts/db-release.mjs', ...args, '--local', '--config', config]);
  try {
    const seed = join(state, 'legacy.sql');
    writeFileSync(seed, ['0001_init.sql', '0002_items.sql', '0003_seed.sql'].map(name => readFileSync(`migrations/${name}`, 'utf8')).join('\n') + `
      ALTER TABLE items ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
      UPDATE items SET featured=1 WHERE id='atomic-habits';
      UPDATE items SET summary='后台保留摘要',cover='https://example.com/custom.webp' WHERE id='quiet';
      INSERT INTO ratings(item_id,score,fingerprint) VALUES ('quiet',4,'192.0.2.1');
    `);
    run([wrangler, 'd1', 'execute', 'tanghulu-db', '--config', config, '--local', '--file', seed]);
    assert.equal(JSON.parse(release('status')).items, 55);
    const gate = () => run(['scripts/check-cloudflare-db.mjs', '--local', '--config', config]);
    assert.throws(gate, /D1 schema is not ready/);
    assert.throws(() => release('upgrade', '--phase', 'content'), /Apply the schema phase/);
    release('upgrade', '--phase', 'schema');
    assert.match(gate(), /Read-only release check passed/);
    assert.equal(query('SELECT COUNT(*) AS n FROM items')[0].n, 55);
    assert.equal(query("SELECT cover FROM items WHERE id='atomic-habits'")[0].cover, '');
    query("INSERT INTO view_totals(item_id,count) VALUES ('quiet',23)");
    release('upgrade', '--phase', 'content');
    assert.equal(query('SELECT COUNT(*) AS n FROM items')[0].n, 63);
    assert.deepEqual(query("SELECT summary,cover FROM items WHERE id='quiet'")[0], { summary: '后台保留摘要', cover: 'https://example.com/custom.webp' });
    assert.equal(query("SELECT featured FROM items WHERE id='atomic-habits'")[0].featured, 1);
    assert.match(query("SELECT cover FROM items WHERE id='atomic-habits'")[0].cover, /^\/images\/covers\/atomic-habits-/);
    assert.deepEqual(query("SELECT score,fingerprint FROM ratings WHERE item_id='quiet'")[0], { score: 4, fingerprint: 'legacy:1' });
    assert.equal(query("SELECT count FROM view_totals WHERE item_id='quiet'")[0].count, 23);
    assert.equal(query('SELECT COUNT(*) AS n FROM tanghulu_release_migrations')[0].n, 5);
    const snapshot = query('SELECT * FROM items ORDER BY id');
    release('upgrade');
    assert.deepEqual(query('SELECT * FROM items ORDER BY id'), snapshot);
    assert.deepEqual(JSON.parse(release('status')).pending, []);
    const backups = readdirSync('.backups').filter(name => !initialBackups.has(name));
    assert.equal(backups.length, 2, '每个实际升级阶段备份一次；重复运行不产生额外备份');
    for (const name of backups) {
      assert.ok(statSync(join('.backups', name)).size > 1000);
      const restored = new DatabaseSync(':memory:');
      try {
        restored.exec(readFileSync(join('.backups', name), 'utf8'));
        assert.equal(restored.prepare('SELECT COUNT(*) AS n FROM items').get().n, 55);
        assert.equal(restored.prepare("SELECT score FROM ratings WHERE item_id='quiet'").get().score, 4);
      } finally { restored.close(); }
      if (process.platform !== 'win32') assert.equal(statSync(join('.backups', name)).mode & 0o777, 0o600);
    }
  } finally {
    rmSync(state, { recursive: true, force: true });
    for (const name of (existsSync('.backups') ? readdirSync('.backups') : [])) {
      if (!initialBackups.has(name)) rmSync(join('.backups', name));
    }
  }
});
