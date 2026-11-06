import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createToken, verifyToken, getAdminToken, tokenCookie, clearCookie, passwordMatches } from '../src/lib/auth.ts';
import { parseItemInput, isValidId, isHttpUrl, isCoverUrl } from '../src/lib/validation.ts';
import { readJson, assertSameOrigin, secureResponse } from '../src/lib/http.ts';
import { fingerprint, rateLimit } from '../src/lib/security.ts';
import { getItemPage, getItemById } from '../src/lib/db.ts';
import { pageNumber, browseUrl } from '../src/lib/browse.ts';

const sample = { title: '测试', category: 'book', summary: '内容摘要', date: '2024-02-29', body: '正文', tags: '读书，学习,读书', mood: ['深夜'] };
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
  const db = { prepare(sql) {
    let args = [];
    return { bind(...values) { args = values; return this; }, async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { return sqlite.prepare(sql).run(...args); } };
  } };
  return { sqlite, db };
}
test('内容校验：去重、中文分隔和缺省场景保留', () => {
  assert.deepEqual(parseItemInput(sample).data.tags, ['读书', '学习']);
  assert.deepEqual(parseItemInput({ ...sample, mood: undefined }).data.mood, []);
  const { mood, ...without } = sample;
  assert.deepEqual(parseItemInput(without, ['原有']).data.mood, ['原有']);
});
for (const [name, changes] of [
  ['错误类型', { title: 2 }], ['超长标题', { title: '长'.repeat(161) }], ['空摘要', { summary: ' ' }],
  ['无效日期', { date: '2025-02-29' }], ['非日期', { date: 'xxxxxxxxxx' }], ['未知分类', { category: '__proto__' }],
  ['脚本 URL', { link: 'javascript:alert(1)' }], ['带密码 URL', { cover: 'https://a:b@example.org/a' }],
  ['非字符串标签', { tags: [3] }], ['过多标签', { tags: Array.from({ length: 21 }, (_, i) => String(i)) }],
]) test(`内容拒绝：${name}`, () => assert.ok('error' in parseItemInput({ ...sample, ...changes })));
test('ID 和 URL 边界', () => {
  assert.equal(isCoverUrl('/images/covers/quiet-abcdef123456.webp'), true);
  for (const path of ['//evil.example/a.webp', '/images/covers/../secret.webp', '/images/covers/test.svg', '/images/covers/%2e%2e/secret.webp']) assert.equal(isCoverUrl(path), false);
  assert.ok('data' in parseItemInput({ ...sample, cover: '/images/covers/quiet-abcdef123456.webp' }));

  assert.ok(isValidId('item_1-a')); assert.ok(!isValidId('../admin')); assert.ok(!isValidId('a'.repeat(101)));
  assert.ok(isHttpUrl('https://example.com')); assert.ok(!isHttpUrl('//example.com'));
});
test('令牌签名、错误密码、篡改及到期', async () => {
  const token = await createToken('test-secret');
  assert.ok(await verifyToken(token, 'test-secret'));
  assert.equal(await verifyToken(token, 'wrong'), false);
  assert.equal(await verifyToken(`${token}x`, 'test-secret'), false);
  assert.equal(await verifyToken('invalid', 'test-secret'), false);
  const now = Date.now;
  try { Date.now = () => now() + 8 * 86400000; assert.equal(await verifyToken(token, 'test-secret'), false); }
  finally { Date.now = now; }
});
test('损坏 Cookie 不崩溃，HTTPS Cookie 属性完整', () => {
  assert.equal(getAdminToken(new Request('https://example.org', { headers: { Cookie: 'admin_tok=%E0' } })), null);
  for (const cookie of [tokenCookie('abc'), clearCookie()]) for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure']) assert.ok(cookie.includes(flag));
  assert.ok(!tokenCookie('abc', false).includes('Secure'));
});
test('密码比较、指纹按用途隔离', async () => {
  assert.ok(await passwordMatches('a', 'a')); assert.ok(!await passwordMatches('a', 'b'));
  const req = new Request('https://example.org', { headers: { 'CF-Connecting-IP': '192.0.2.1' } });
  const fp = await fingerprint(req, 'secret', 'views');
  assert.match(fp, /^[a-f0-9]{64}$/); assert.notEqual(fp, await fingerprint(req, 'secret', 'ratings'));
});
test('来源检查：跨站和无 Origin 写请求被拒绝', () => {
  for (const origin of ['', 'https://evil.example']) assert.throws(() => assertSameOrigin(new Request('https://good.example/api/x', { method: 'POST', headers: { Origin: origin } })), { status: 403 });
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://good.example/api/x', { method: 'POST', headers: { Origin: 'https://good.example' } })));
});
test('JSON 类型、格式和流式体积限制', async () => {
  const req = body => new Request('https://example.org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.deepEqual(await readJson(req('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(req('bad')), { status: 400 });
  await assert.rejects(readJson(req('x'.repeat(11)), 10), { status: 413 });
  await assert.rejects(readJson(new Request('https://example.org', { method: 'POST', body: '{}' })), { status: 415 });
});
test('安全响应头和状态保留', () => {
  const response = secureResponse(Response.json({ error: 'bad' }, { status: 401 }), new URL('https://example.org/api/admin/x'));
  assert.equal(response.status, 401); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.ok(response.headers.has('Strict-Transport-Security'));
});
test('迁移完整、阅读内容补全、分页不读取正文', async () => {
  const { db, sqlite } = database();
  try {
    const first = await getItemPage(db, { page: 1 });
    const second = await getItemPage(db, { page: 2 });
    assert.match((await getItemById(db, 'atomic-habits')).cover, /^\/images\/covers\//);
    assert.ok(first.items.some(item => item.cover.startsWith('/images/covers/')));
    assert.equal(first.items.length, 12); assert.equal(first.items[0].body, '');
    assert.ok(!second.items.some(item => first.items.some(old => old.id === item.id)));
    assert.equal((await getItemPage(db, { page: 999 })).page, first.pages);
    assert.match(sqlite.prepare("SELECT body FROM items WHERE id='interstellar'").get().body, /怎样安排这次观看/);
  } finally { sqlite.close(); }
});
test('浏览去重、不同访客与时段计数、删除级联清理', () => {
  const { sqlite } = database();
  try {
    sqlite.exec("INSERT INTO view_totals VALUES ('interstellar', 10)");
    const insert = sqlite.prepare("INSERT OR IGNORE INTO view_events VALUES ('interstellar', ?, ?)");
    insert.run('a', 1); insert.run('a', 1); insert.run('b', 1); insert.run('a', 2);
    assert.equal(sqlite.prepare("SELECT count FROM view_totals WHERE item_id='interstellar'").get().count, 13);
    sqlite.exec("INSERT INTO ratings (item_id, score, fingerprint) VALUES ('interstellar', 4, 'x')");
    sqlite.exec("DELETE FROM items WHERE id='interstellar'");
    for (const table of ['ratings', 'view_events', 'view_totals']) assert.equal(sqlite.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE item_id='interstellar'`).get().count, 0);
  } finally { sqlite.close(); }
});
test('原子登录限流在超过阈值后拒绝', async () => {
  const { db, sqlite } = database();
  try { await rateLimit(db, 'key', 2, 900); await rateLimit(db, 'key', 2, 900); await assert.rejects(rateLimit(db, 'key', 2, 900), { status: 429 }); }
  finally { sqlite.close(); }
});
test('分页参数拒绝异常值并正确编码', () => {
  for (const value of ['-1', 'Infinity', '1.2', 'x']) assert.equal(pageNumber(value), 1);
  assert.equal(browseUrl('/', 'book', 'oldest', 2), '/?cat=book&sort=oldest&page=2#collection');
});
