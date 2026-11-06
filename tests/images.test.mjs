import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

const images = JSON.parse(readFileSync('src/data/images.json', 'utf8'));
const sources = JSON.parse(readFileSync('docs/image-sources.json', 'utf8'));
const localPattern = /^\/images\/covers\/[a-z0-9-]+-[a-f0-9]{12}\.webp$/;

test('图片清单、来源、尺寸和实际文件一致，缺图有明确原因', async () => {
  const ids = readdirSync('src/content/items').filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
  assert.equal(new Set(sources.items.map(item => item.id)).size, sources.items.length);
  for (const id of ids) {
    const image = images[id];
    if (!image) { assert.ok(sources.pending.some(item => item.id === id && item.reason), id); continue; }
    const source = sources.items.find(item => item.id === id);
    assert.ok(source?.sourceUrl && source?.sourcePage && source?.rights, id);
    assert.ok(image.alt && image.width > 0 && image.height > 0, id);
    assert.ok(['logo', 'book', 'poster', 'photo', 'artwork'].includes(image.kind), id);
    if (source.storage === 'external') {
      assert.equal(new URL(image.src).hostname, 'covers.openlibrary.org');
      assert.equal(image.src, source.sourceUrl);
      assert.ok(image.edition.includes('ISBN'), id);
    } else {
      assert.match(image.src, localPattern);
      const file = readFileSync(`public${image.src}`);
      const meta = await sharp(file).metadata();
      assert.equal(meta.format, 'webp', id);
      assert.equal(meta.width, image.width, id);
      assert.equal(meta.height, image.height, id);
      assert.equal(file.length, image.bytes, id);
      assert.ok(file.length < 150000, `${id}: 缩略图预算超限`);
    }
    if (source.license === 'CC BY-SA 4.0') {
      assert.equal(image.credit, source.credit);
      assert.equal(image.licenseUrl, source.licenseUrl);
      assert.ok(image.transformation);
    }
  }
  assert.equal(ids.length, Object.keys(images).length + sources.pending.length);
});

test('图片迁移保留自定义封面及重新命名条目，不清除交互数据且可重复执行', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql') && f < '0007').sort()) db.exec(readFileSync(`migrations/${file}`, 'utf8'));
    db.exec("UPDATE items SET cover='https://example.com/my-cover.jpg' WHERE id='quiet'; UPDATE items SET title='另一本书' WHERE id='atomic-habits'; INSERT INTO ratings(item_id,score,fingerprint) VALUES('interstellar',5,'image-test'); INSERT INTO view_totals(item_id,count) VALUES('interstellar',17)");
    const sql = readFileSync('migrations/0007_content_images.sql', 'utf8');
    db.exec(sql);
    assert.equal(db.prepare("SELECT cover FROM items WHERE id='quiet'").get().cover, 'https://example.com/my-cover.jpg');
    assert.equal(db.prepare("SELECT cover FROM items WHERE id='atomic-habits'").get().cover, '');
    assert.equal(db.prepare("SELECT cover FROM items WHERE id='interstellar'").get().cover, images.interstellar.src);
    const snapshot = JSON.stringify(db.prepare('SELECT * FROM items ORDER BY id').all());
    db.exec(sql);
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM items ORDER BY id').all()), snapshot);
    assert.equal(db.prepare("SELECT score FROM ratings WHERE item_id='interstellar'").get().score, 5);
    assert.equal(db.prepare("SELECT count FROM view_totals WHERE item_id='interstellar'").get().count, 17);
  } finally { db.close(); }
});
