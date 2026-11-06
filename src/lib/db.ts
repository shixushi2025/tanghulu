import { isHttpUrl, isCoverUrl } from './validation';
export interface Item {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  cover: string;
  date: string;
  link: string;
  mood: string[];
  country: string;
  body: string;
}

function parseList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try { const list: unknown = JSON.parse(value); return Array.isArray(list) ? list.filter((entry): entry is string => typeof entry === 'string') : []; }
  catch { return []; }
}
function publicUrl(value: unknown): string {
  return typeof value === 'string' && isHttpUrl(value) ? value : '';
}
function parseItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as string,
    tags: parseList(row.tags),
    summary: row.summary as string,
    cover: typeof row.cover === 'string' && isCoverUrl(row.cover) ? row.cover : '',
    date: row.date as string,
    link: publicUrl(row.link),
    mood: parseList(row.mood),
    country: (row.country as string) || '',
    body: (row.body as string) || '',
  };
}

const SUMMARY_COLUMNS = 'id, title, category, tags, summary, cover, date, link, mood, country';

export async function getAllItems(db: D1Database): Promise<Item[]> {
  const { results } = await db
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM items ORDER BY date DESC, id`)
    .all();
  return results.map(parseItem);
}

export async function getItemsByCategory(db: D1Database, category: string): Promise<Item[]> {
  const { results } = await db
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM items WHERE category = ? ORDER BY date DESC, id`)
    .bind(category)
    .all();
  return results.map(parseItem);
}

export async function getItemById(db: D1Database, id: string): Promise<Item | null> {
  const row = await db
    .prepare('SELECT * FROM items WHERE id = ?')
    .bind(id)
    .first();
  return row ? parseItem(row) : null;
}

export async function searchItems(db: D1Database, q: string): Promise<Item[]> {
  const like = `%${q}%`;
  const { results } = await db
    .prepare('SELECT * FROM items WHERE title LIKE ? OR summary LIKE ? OR tags LIKE ? ORDER BY date DESC LIMIT 30')
    .bind(like, like, like)
    .all();
  return results.map(parseItem);
}

export type ItemInput = Omit<Item, 'id'> & { id?: string };

export async function createItem(db: D1Database, id: string, data: Omit<Item, 'id'>): Promise<void> {
  await db
    .prepare(
      'INSERT INTO items (id, title, category, tags, summary, cover, date, link, mood, country, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      data.title,
      data.category,
      JSON.stringify(data.tags),
      data.summary,
      data.cover,
      data.date,
      data.link,
      JSON.stringify(data.mood),
      data.country,
      data.body,
    )
    .run();
}

export async function updateItem(db: D1Database, id: string, data: Omit<Item, 'id'>): Promise<void> {
  await db
    .prepare(
      'UPDATE items SET title=?, category=?, tags=?, summary=?, cover=?, date=?, link=?, mood=?, country=?, body=?, updated_at=unixepoch() WHERE id=?',
    )
    .bind(
      data.title,
      data.category,
      JSON.stringify(data.tags),
      data.summary,
      data.cover,
      data.date,
      data.link,
      JSON.stringify(data.mood),
      data.country,
      data.body,
      id,
    )
    .run();
}

export async function deleteItem(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
}

export async function countByCategory(db: D1Database): Promise<Record<string, number>> {
  const { results } = await db
    .prepare('SELECT category, COUNT(*) as count FROM items GROUP BY category')
    .all();
  return Object.fromEntries(results.map(r => [r.category, r.count]));
}

export async function getRelatedItems(db: D1Database, category: string, id: string): Promise<Item[]> {
  const { results } = await db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM items WHERE category=? AND id<>? ORDER BY date DESC, id LIMIT 3`).bind(category, id).all();
  return results.map(parseItem);
}

export async function getItemPage(db: D1Database, options: { category?: string; sort?: string; page?: number; size?: number }) {
  const { category = '', sort = 'newest', page = 1, size = 12 } = options;
  const where = category ? 'WHERE category=?' : '';
  const args = category ? [category] : [];
  const total = await db.prepare(`SELECT COUNT(*) as count FROM items ${where}`).bind(...args).first<{ count: number }>();
  const pages = Math.max(1, Math.ceil((total?.count ?? 0) / size));
  const current = Math.min(Math.max(1, page), pages);
  const order = sort === 'title' ? 'title COLLATE NOCASE, id' : sort === 'oldest' ? 'date ASC, id' : 'date DESC, id';
  const { results } = await db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM items ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...args, size, (current - 1) * size).all();
  return { items: results.map(parseItem), total: total?.count ?? 0, pages, page: current };
}

export async function getFeaturedItems(db: D1Database): Promise<Item[]> {
  const { results } = await db.prepare(`SELECT ${SUMMARY_COLUMNS} FROM items ORDER BY CASE id WHEN 'interstellar' THEN 0 WHEN 'thinking-fast-slow' THEN 1 WHEN 'chatgpt' THEN 2 ELSE 3 END, date DESC, id LIMIT 3`).all();
  return results.map(parseItem);
}
