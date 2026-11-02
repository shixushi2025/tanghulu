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
  featured: boolean;
}

export type ItemInput = Omit<Item, 'id'> & { id?: string };

/** Used when the featured column is missing or fewer than 3 rows are flagged. */
export const FEATURED_FALLBACK_IDS = [
  'chatgpt',
  'claude-ai',
  'atomic-habits',
  'interstellar',
  'sapiens',
  'podcast-lex',
] as const;

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as string,
    tags: parseJsonArray(row.tags),
    summary: (row.summary as string) || '',
    cover: (row.cover as string) || '',
    date: row.date as string,
    link: (row.link as string) || '',
    mood: parseJsonArray(row.mood),
    country: (row.country as string) || '',
    body: (row.body as string) || '',
    featured: Number(row.featured) === 1,
  };
}

export async function getAllItems(db: D1Database): Promise<Item[]> {
  const { results } = await db.prepare('SELECT * FROM items ORDER BY date DESC').all();
  return results.map((row) => parseItem(row as Record<string, unknown>));
}

export async function getItemsByCategory(db: D1Database, category: string): Promise<Item[]> {
  const { results } = await db
    .prepare('SELECT * FROM items WHERE category = ? ORDER BY date DESC')
    .bind(category)
    .all();
  return results.map((row) => parseItem(row as Record<string, unknown>));
}

export async function getItemById(db: D1Database, id: string): Promise<Item | null> {
  const row = await db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
  return row ? parseItem(row as Record<string, unknown>) : null;
}

export async function getRelatedItems(
  db: D1Database,
  category: string,
  excludeId: string,
  limit = 3,
): Promise<Item[]> {
  const { results } = await db
    .prepare('SELECT * FROM items WHERE category = ? AND id != ? ORDER BY date DESC LIMIT ?')
    .bind(category, excludeId, limit)
    .all();
  return results.map((row) => parseItem(row as Record<string, unknown>));
}

export function pickFeatured(items: Item[], limit = 6): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const out: Item[] = [];
  const seen = new Set<string>();

  const push = (item?: Item) => {
    if (!item || seen.has(item.id) || out.length >= limit) return;
    out.push(item);
    seen.add(item.id);
  };

  for (const item of items) {
    if (item.featured) push(item);
  }

  if (out.length < 3) {
    for (const id of FEATURED_FALLBACK_IDS) push(byId.get(id));
  }

  if (out.length < 3) {
    for (const item of items) push(item);
  }

  return out.slice(0, Math.min(Math.max(out.length, 0), limit));
}

export function countByCategory(items: Item[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }
  return counts;
}

export async function createItem(db: D1Database, id: string, data: Omit<Item, 'id'>): Promise<void> {
  await db
    .prepare(
      'INSERT INTO items (id, title, category, tags, summary, cover, date, link, mood, country, body, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      data.featured ? 1 : 0,
    )
    .run();
}

export async function updateItem(db: D1Database, id: string, data: Omit<Item, 'id'>): Promise<void> {
  await db
    .prepare(
      'UPDATE items SET title=?, category=?, tags=?, summary=?, cover=?, date=?, link=?, mood=?, country=?, body=?, featured=?, updated_at=unixepoch() WHERE id=?',
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
      data.featured ? 1 : 0,
      id,
    )
    .run();
}

export async function deleteItem(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
}
