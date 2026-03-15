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

function parseItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    summary: row.summary as string,
    cover: (row.cover as string) || '',
    date: row.date as string,
    link: (row.link as string) || '',
    mood: JSON.parse((row.mood as string) || '[]'),
    country: (row.country as string) || '',
    body: (row.body as string) || '',
  };
}

export async function getAllItems(db: D1Database): Promise<Item[]> {
  const { results } = await db
    .prepare('SELECT * FROM items ORDER BY date DESC')
    .all();
  return results.map(parseItem);
}

export async function getItemsByCategory(db: D1Database, category: string): Promise<Item[]> {
  const { results } = await db
    .prepare('SELECT * FROM items WHERE category = ? ORDER BY date DESC')
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

export async function countByCategory(db: D1Database): Promise<Record<string, number>> {
  const { results } = await db
    .prepare('SELECT category, COUNT(*) as count FROM items GROUP BY category')
    .all();
  return Object.fromEntries(results.map(r => [r.category, r.count]));
}
