import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const state = mkdtempSync(join(tmpdir(), 'tanghulu-e2e-'));
const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
const migration = spawnSync(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'tanghulu-db', '--config', 'wrangler.toml', '--local', '--persist-to', state], { stdio: 'inherit', env: { ...process.env, CI: '1' } });
if (migration.status !== 0) { rmSync(state, { recursive: true, force: true }); process.exit(migration.status ?? 1); }
const server = spawn(process.execPath, [wrangler, 'dev', '--config', 'wrangler.toml', '--port', '4321', '--persist-to', state, '--var', 'ADMIN_PASSWORD:local-e2e-only-password', '--var', 'VISITOR_HASH_SECRET:local-e2e-only-hash-secret'], { stdio: 'inherit' });
const stop = () => server.kill('SIGTERM');
process.on('SIGTERM', stop); process.on('SIGINT', stop);
server.on('exit', code => { rmSync(state, { recursive: true, force: true }); process.exit(code ?? 0); });
