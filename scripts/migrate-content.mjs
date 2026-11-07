import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// Generate a reviewable seed, never rewrite an already applied migration.
const output = resolve(process.argv[2] || 'content-seed.sql');
if (output.includes(`${process.platform === 'win32' ? '\\' : '/'}migrations${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('请输出到 migrations 以外，已应用迁移不可覆盖');
const escape = value => `'${String(value ?? '').replace(/'/g, "''")}'`;
const statements = ['-- Adds missing items only. Existing editorial changes are preserved.'];
for (const file of (await readdir('src/content/items')).filter(file => file.endsWith('.md')).sort()) {
  const content = await readFile(`src/content/items/${file}`, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`缺少 frontmatter: ${file}`);
  const data = parse(match[1]);
  if (!data.title || !data.category || !data.summary || !data.date) throw new Error(`缺少必要字段: ${file}`);
  const values = [file.slice(0, -3), data.title, data.category, JSON.stringify(data.tags || []), data.summary, data.cover || '', data.date, data.link || '', JSON.stringify(data.mood || []), data.country || '', match[2].trim(), data.featured ? 1 : 0];
  statements.push(`INSERT INTO items (id, title, category, tags, summary, cover, date, link, mood, country, body, featured) VALUES (${values.map(escape).join(', ')}) ON CONFLICT(id) DO NOTHING;`);
}
await writeFile(output, statements.join('\n') + '\n');
console.log(`Generated ${statements.length - 1} items → ${output}`);
