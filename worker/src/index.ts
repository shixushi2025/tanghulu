import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clearCookie, createToken, getAdminToken, tokenCookie, verifyToken } from './auth';
import {
  countByCategory,
  createItem,
  deleteItem,
  getAllItems,
  getItemById,
  getItemsByCategory,
  getRelatedItems,
  pickFeatured,
  updateItem,
  type Item,
} from './db';

export type Bindings = {
  TANGHULU_DB: D1Database;
  TANGHULU_VIEWS: KVNamespace;
  ADMIN_PASSWORD: string;
  ASSETS: Fetcher;
};

const SITE_URL = 'https://tanghulu.life';
const VISIBLE_CATEGORIES = ['film', 'book', 'tool', 'health', 'podcast'] as const;
const ALL_CATEGORIES = [
  'film',
  'book',
  'tool',
  'health',
  'podcast',
  'social',
  'communication',
  'car',
  'camera',
  'creator',
  'video',
  'other',
] as const;

const CORS_ORIGINS = [
  'https://tanghulu.life',
  'https://www.tanghulu.life',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  '*',
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

function isHttps(url: string): boolean {
  return new URL(url).protocol === 'https:';
}

type ItemFields = Omit<Item, 'id'>;

function parseItemFields(body: unknown): { error: string } | ItemFields {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = String(b.title ?? '').trim();
  const category = String(b.category ?? '').trim();
  const summary = String(b.summary ?? '').trim();
  const date = String(b.date ?? '').trim();

  if (!title) return { error: 'Title is required' };
  if (!ALL_CATEGORIES.includes(category as (typeof ALL_CATEGORIES)[number])) {
    return { error: 'Invalid category' };
  }
  if (!summary) return { error: 'Summary is required' };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date' };

  const splitList = (value: unknown) =>
    String(value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const tags = Array.isArray(b.tags) ? b.tags.map(String).map((s) => s.trim()).filter(Boolean) : splitList(b.tags);
  const mood = Array.isArray(b.mood) ? b.mood.map(String).map((s) => s.trim()).filter(Boolean) : splitList(b.mood);

  const featured =
    b.featured === true || b.featured === 1 || b.featured === '1' || b.featured === 'true';

  return {
    title,
    category,
    summary,
    date,
    tags,
    mood,
    cover: String(b.cover ?? '').trim(),
    link: String(b.link ?? '').trim(),
    country: String(b.country ?? '').trim(),
    body: String(b.body ?? '').trim(),
    featured,
  };
}

async function requireAdmin(c: { env: Bindings; req: { raw: Request } }): Promise<Response | null> {
  const password = c.env.ADMIN_PASSWORD;
  if (!password) {
    return Response.json({ error: 'Admin not configured' }, { status: 503 });
  }
  const token = getAdminToken(c.req.raw);
  const valid = token ? await verifyToken(token, password) : false;
  if (!valid) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/home', async (c) => {
  const items = await getAllItems(c.env.TANGHULU_DB);
  return c.json({
    featured: pickFeatured(items),
    items,
    counts: countByCategory(items),
  });
});

app.get('/api/items', async (c) => {
  const category = c.req.query('category');
  const featuredOnly = c.req.query('featured') === '1';
  const items = category
    ? await getItemsByCategory(c.env.TANGHULU_DB, category)
    : await getAllItems(c.env.TANGHULU_DB);
  return c.json({
    items: featuredOnly ? pickFeatured(items) : items,
    counts: countByCategory(items),
  });
});

app.get('/api/items/:id/related', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  const item = await getItemById(c.env.TANGHULU_DB, id);
  if (!item) return c.json({ error: 'Not found' }, 404);
  const related = await getRelatedItems(c.env.TANGHULU_DB, item.category, item.id, 3);
  return c.json({ items: related });
});

app.get('/api/items/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  const item = await getItemById(c.env.TANGHULU_DB, id);
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json({ item });
});

app.get('/api/stats', async (c) => {
  const items = await getAllItems(c.env.TANGHULU_DB);
  return c.json({ counts: countByCategory(items), total: items.length });
});

app.get('/api/sitemap.xml', async (c) => {
  const items = await getAllItems(c.env.TANGHULU_DB);
  const paths = [
    '/',
    '/about',
    '/search',
    ...VISIBLE_CATEGORIES.map((key) => `/category/${key}`),
    ...items.map((item) => `/item/${item.id}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) =>
      `  <url><loc>${SITE_URL}${path}</loc><changefreq>weekly</changefreq></url>`,
  )
  .join('\n')}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
});

async function ratingResult(db: D1Database, id: string) {
  const result = await db
    .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
    .bind(id)
    .first();
  return {
    average: result?.avg ? Math.round((result.avg as number) * 10) / 10 : null,
    count: Number(result?.count ?? 0),
  };
}

app.get('/api/ratings/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  return c.json(await ratingResult(c.env.TANGHULU_DB, id), {
    headers: { 'Cache-Control': 'no-store' },
  });
});

app.post('/api/ratings/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const score = Number((body as Record<string, unknown>)?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return c.json({ error: 'Score must be an integer between 1 and 5' }, 400);
  }
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  await c.env.TANGHULU_DB.prepare(
    'INSERT INTO ratings (item_id, score, fingerprint) VALUES (?, ?, ?) ON CONFLICT(item_id, fingerprint) DO UPDATE SET score = excluded.score',
  )
    .bind(id, score, ip)
    .run();
  return c.json(await ratingResult(c.env.TANGHULU_DB, id));
});

app.get('/api/views/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  const count = await c.env.TANGHULU_VIEWS.get(id);
  return c.json(
    { count: parseInt(count ?? '0', 10) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
});

app.post('/api/views/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const kv = c.env.TANGHULU_VIEWS;
  const throttleKey = `throttle:${id}:${ip}`;
  const throttled = await kv.get(throttleKey);
  if (!throttled) {
    await kv.put(throttleKey, '1', { expirationTtl: 3600 });
    const current = await kv.get(id);
    const newCount = parseInt(current ?? '0', 10) + 1;
    await kv.put(id, String(newCount));
    return c.json({ count: newCount });
  }
  const current = await kv.get(id);
  return c.json({ count: parseInt(current ?? '0', 10) });
});

app.post('/api/admin/login', async (c) => {
  const password = c.env.ADMIN_PASSWORD;
  if (!password) return c.json({ error: 'Admin not configured' }, 503);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request' }, 400);
  }
  const submitted = String((body as Record<string, unknown>)?.password ?? '');
  if (!submitted || submitted !== password) {
    return c.json({ error: 'Incorrect password' }, 401);
  }
  const token = await createToken(password);
  return c.json(
    { ok: true },
    { headers: { 'Set-Cookie': tokenCookie(token, isHttps(c.req.url)) } },
  );
});

app.post('/api/admin/logout', (c) =>
  c.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie(isHttps(c.req.url)) } }),
);

app.get('/api/admin/session', async (c) => {
  const denied = await requireAdmin(c);
  if (denied) return denied;
  return c.json({ ok: true });
});

app.post('/api/admin/items', async (c) => {
  const denied = await requireAdmin(c);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const raw = body as Record<string, unknown>;
  const id = String(raw.id ?? '').trim();
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  const parsed = parseItemFields(body);
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  const existing = await getItemById(c.env.TANGHULU_DB, id);
  if (existing) return c.json({ error: 'ID already exists' }, 409);
  await createItem(c.env.TANGHULU_DB, id, parsed);
  return c.json({ ok: true, id }, 201);
});

app.put('/api/admin/items/:id', async (c) => {
  const denied = await requireAdmin(c);
  if (denied) return denied;
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  const parsed = parseItemFields(body);
  if ('error' in parsed) return c.json({ error: parsed.error }, 400);
  await updateItem(c.env.TANGHULU_DB, id, parsed);
  return c.json({ ok: true });
});

app.delete('/api/admin/items/:id', async (c) => {
  const denied = await requireAdmin(c);
  if (denied) return denied;
  const id = c.req.param('id');
  if (!isValidId(id)) return c.json({ error: 'Invalid id' }, 400);
  await deleteItem(c.env.TANGHULU_DB, id);
  return c.json({ ok: true });
});

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

function serveAsset(env: Bindings, request: Request, pathname: string) {
  return env.ASSETS.fetch(new Request(new URL(pathname, request.url), request));
}

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    // CSR shells (Astro emits these as /item/index.html and /admin/edit/index.html).
    // Workers SPA not_found_handling only serves the site-root /index.html.
    if (/^\/item\/[A-Za-z0-9_-]+\/?$/.test(pathname)) {
      return serveAsset(env, request, '/item/');
    }
    if (/^\/admin\/items\/[A-Za-z0-9_-]+\/edit\/?$/.test(pathname)) {
      return serveAsset(env, request, '/admin/edit/');
    }

    return env.ASSETS.fetch(request);
  },
};
