import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { isValidId } from '../../../lib/validation';
import { HttpError } from '../../../lib/http';
import { fingerprint, rateLimit } from '../../../lib/security';

async function requireItem(id: string) {
  if (!isValidId(id)) throw new HttpError(400, '无效 ID');
  if (!await env.TANGHULU_DB.prepare('SELECT id FROM items WHERE id=?').bind(id).first()) throw new HttpError(404, '内容不存在');
}
async function count(id: string) {
  const row = await env.TANGHULU_DB.prepare('SELECT count FROM view_totals WHERE item_id=?').bind(id).first<{ count: number }>();
  if (row) return row.count;
  const legacy = Number(await env.TANGHULU_VIEWS.get(id));
  return Number.isSafeInteger(legacy) && legacy > 0 ? legacy : 0;
}
export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  await requireItem(id);
  return Response.json({ count: await count(id) });
};
export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  await requireItem(id);
  const fp = await fingerprint(request, env.VISITOR_HASH_SECRET || env.ADMIN_PASSWORD, 'views');
  const db = env.TANGHULU_DB;
  await rateLimit(db, `views:${fp}`, 120, 900);
  const baseline = await count(id);
  const bucket = Math.floor(Date.now() / 3600000);
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO view_totals (item_id, count) SELECT id, ? FROM items WHERE id=?').bind(baseline, id),
    db.prepare('INSERT OR IGNORE INTO view_events (item_id, fingerprint, bucket) SELECT id, ?, ? FROM items WHERE id=?').bind(fp, bucket, id),
    db.prepare('DELETE FROM view_events WHERE rowid IN (SELECT rowid FROM view_events WHERE bucket < ? LIMIT 100)').bind(bucket - 1),
  ]);
  return Response.json({ count: await count(id) });
};
