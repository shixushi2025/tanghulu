import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parse } from 'yaml';

const columns = ['title', 'category', 'tags', 'summary', 'cover', 'date', 'link', 'mood', 'country', 'body'];
const registry = JSON.parse(readFileSync('docs/content-sources.json', 'utf8'));
const content = readdirSync('src/content/items').filter(file => file.endsWith('.md')).sort().map(file => {
  const source = readFileSync(`src/content/items/${file}`, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  assert.ok(match, `缺少 frontmatter: ${file}`);
  const data = parse(match[1]);
  return { id: file.slice(0, -3), ...Object.fromEntries(columns.map(key => [key,
    key === 'body' ? match[2].trim() : ['tags', 'mood'].includes(key) ? JSON.stringify(data[key] || []) : data[key] ?? '',
  ])) };
});
const migrations = readdirSync('migrations').filter(file => file.endsWith('.sql')).sort();
const refresh = readFileSync('migrations/0006_content_refresh.sql', 'utf8');
function database(beforeRefresh = false) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const file of migrations) {
    if (beforeRefresh && file >= '0006') break;
    db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }
  return db;
}
function snapshot(db) { return JSON.stringify(db.prepare('SELECT * FROM items ORDER BY id').all()); }

test('所有内容源与全新数据库逐字段一致，每条都有来源状态', () => {
  const db = database();
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM items').get().n, content.length);
    assert.equal(new Set(registry.items.map(item => item.id)).size, content.length);
    assert.equal(registry.items.length, content.length);
    for (const item of content) {
      assert.deepEqual({ ...db.prepare(`SELECT id, ${columns.join(', ')} FROM items WHERE id=?`).get(item.id) }, item, item.id);
      const record = registry.items.find(record => record.id === item.id);
      assert.ok(record, `${item.id}: 缺少来源记录`);
      assert.ok(Object.hasOwn(registry.statusDefinitions, record.status), item.id);
      assert.match(record.reviewed, /^\d{4}-\d{2}-\d{2}$/);
      if (!item.link) assert.equal(record.status, 'pending', `${item.id}: 空链接需要明确待核实`);
      if (record.status === 'verified') assert.ok(record.sources.length > 0, item.id);
      for (const source of record.sources) {
        const url = new URL(source.url);
        assert.ok(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, item.id);
      }
    }
    console.log(`已验证 ${content.length} 条内容、${registry.items.length} 条来源记录与迁移结果一致。`);
  } finally { db.close(); }
});

test('内容升级保留任一字段被后台修改的条目，以及新增 ID 冲突', () => {
  for (const column of columns) {
    const db = database(true);
    try {
      db.prepare(`UPDATE items SET ${column}=? WHERE id='quiet'`).run(['tags', 'mood'].includes(column) ? '["后台保留"]' : '后台修改');
      db.exec("INSERT INTO items (id,title,category,summary,date,body) VALUES ('obsidian','自建内容','other','后台摘要','2026-11-06','后台正文')");
      const before = db.prepare("SELECT * FROM items WHERE id IN ('quiet','obsidian') ORDER BY id").all();
      db.exec(refresh);
      assert.deepEqual(db.prepare("SELECT * FROM items WHERE id IN ('quiet','obsidian') ORDER BY id").all(), before, column);
      assert.ok(db.prepare("SELECT id FROM items WHERE id='zotero'").get(), '其他新增内容仍应导入');
    } finally { db.close(); }
  }
});

test('内容升级不清除评分或浏览量，重复执行无副作用', () => {
  const db = database(true);
  try {
    db.exec("INSERT INTO ratings(item_id,score,fingerprint) VALUES ('quiet',4,'test-content-reader'); INSERT INTO view_totals(item_id,count) VALUES ('quiet',23)");
    db.exec(refresh);
    const after = snapshot(db);
    db.exec(refresh);
    assert.equal(snapshot(db), after);
    assert.equal(db.prepare("SELECT score FROM ratings WHERE item_id='quiet'").get().score, 4);
    assert.equal(db.prepare("SELECT count FROM view_totals WHERE item_id='quiet'").get().count, 23);
  } finally { db.close(); }
});
