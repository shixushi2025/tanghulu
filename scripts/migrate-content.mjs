import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const itemsDir = join(__dirname, '../src/content/items');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const raw = match[1];
  const body = match[2].trim();
  const data = {};

  for (const line of raw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // array: [a, b, c]
    if (val.startsWith('[')) {
      try {
        data[key] = JSON.parse(val.replace(/'/g, '"'));
      } catch {
        data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      }
    // quoted string
    } else if (val.startsWith('"') || val.startsWith("'")) {
      data[key] = val.replace(/^['"]|['"]$/g, '');
    // number
    } else if (!isNaN(val) && val !== '') {
      data[key] = Number(val);
    } else {
      data[key] = val;
    }
  }

  return { data, body };
}

function escape(str) {
  return String(str ?? '').replace(/'/g, "''");
}

const files = (await readdir(itemsDir)).filter(f => f.endsWith('.md'));
const statements = [];

for (const file of files) {
  const id = file.replace('.md', '');
  const content = await readFile(join(itemsDir, file), 'utf8');
  const parsed = parseFrontmatter(content);
  if (!parsed) { console.warn(`skip: ${file}`); continue; }

  const { data, body } = parsed;

  const tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
  const mood = JSON.stringify(Array.isArray(data.mood) ? data.mood : []);
  const date = data.date ? String(data.date).slice(0, 10) : new Date().toISOString().slice(0, 10);

  statements.push(
    `INSERT OR REPLACE INTO items (id, title, category, tags, summary, cover, date, link, mood, country, body) VALUES ('${escape(id)}', '${escape(data.title)}', '${escape(data.category)}', '${escape(tags)}', '${escape(data.summary)}', '${escape(data.cover || '')}', '${escape(date)}', '${escape(data.link || '')}', '${escape(mood)}', '${escape(data.country || '')}', '${escape(body)}');`
  );
}

const sql = statements.join('\n');
await writeFile(join(__dirname, '../migrations/0003_seed.sql'), sql);
console.log(`Generated ${statements.length} INSERT statements → migrations/0003_seed.sql`);
