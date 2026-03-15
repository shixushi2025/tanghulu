import type { APIRoute } from 'astro';
import { createItem, getItemById } from '../../../../lib/db';
import { allCategories } from '../../../../lib/categories';

function parseBody(body: unknown) {
  const b = body as Record<string, unknown>;
  const id = String(b.id ?? '').trim();
  const title = String(b.title ?? '').trim();
  const category = String(b.category ?? '').trim();
  const summary = String(b.summary ?? '').trim();
  const date = String(b.date ?? '').trim();

  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return { error: 'Invalid id' };
  if (!title) return { error: 'Title is required' };
  if (!allCategories.includes(category as never)) return { error: 'Invalid category' };
  if (!summary) return { error: 'Summary is required' };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date' };

  const tags = String(b.tags ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const mood = String(b.mood ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const cover = String(b.cover ?? '').trim();
  const link = String(b.link ?? '').trim();
  const country = String(b.country ?? '').trim();
  const bodyText = String(b.body ?? '').trim();

  return { id, data: { title, category, summary, date, tags, mood, cover, link, country, body: bodyText } };
}

export const POST: APIRoute = async ({ locals, request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseBody(body);
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const db = (locals as App.Locals).runtime.env.TANGHULU_DB;

  const existing = await getItemById(db, parsed.id);
  if (existing) return Response.json({ error: 'ID already exists' }, { status: 409 });

  await createItem(db, parsed.id, parsed.data);
  return Response.json({ ok: true, id: parsed.id }, { status: 201 });
};
