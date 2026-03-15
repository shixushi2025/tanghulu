import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { updateItem, deleteItem } from '../../../../lib/db';
import { allCategories } from '../../../../lib/categories';

function isValidId(id: string) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

function parseBody(id: string, body: unknown) {
  const b = body as Record<string, unknown>;
  const title = String(b.title ?? '').trim();
  const category = String(b.category ?? '').trim();
  const summary = String(b.summary ?? '').trim();
  const date = String(b.date ?? '').trim();

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

  return { data: { title, category, summary, date, tags, mood, cover, link, country, body: bodyText } };
}

export const PUT: APIRoute = async ({ params, locals, request }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseBody(id, body);
  if ('error' in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const db = env.TANGHULU_DB;
  await updateItem(db, id, parsed.data);
  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const db = env.TANGHULU_DB;
  await deleteItem(db, id);
  return Response.json({ ok: true });
};
