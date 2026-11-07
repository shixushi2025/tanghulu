import { env } from 'cloudflare:workers';
import type { WorkerRoute } from '../types';
import { isValidId } from '../../src/lib/validation';
import { HttpError, readJson } from '../../src/lib/http';
import { fingerprint, rateLimit } from '../../src/lib/security';

async function requireItem(id: string) {
  if (!isValidId(id)) throw new HttpError(400, '无效 ID');
  if (!await env.TANGHULU_DB.prepare('SELECT id FROM items WHERE id=?').bind(id).first()) throw new HttpError(404, '内容不存在');
}
async function result(id: string) {
  const row = await env.TANGHULU_DB.prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id=?').bind(id).first<{ avg: number | null; count: number }>();
  return { average: row?.avg ? Math.round(row.avg * 10) / 10 : null, count: row?.count ?? 0 };
}
export const GET: WorkerRoute = async ({ params }) => {
  const id = params.id ?? '';
  await requireItem(id);
  return Response.json(await result(id));
};
export const POST: WorkerRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  await requireItem(id);
  const body = await readJson(request, 1024);
  const score = body && typeof body === 'object' && 'score' in body ? body.score : null;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) throw new HttpError(400, '评分须为 1–5 的整数');
  const fp = await fingerprint(request, env.VISITOR_HASH_SECRET || env.ADMIN_PASSWORD, 'rating');
  await rateLimit(env.TANGHULU_DB, `rating:${fp}`, 60, 900);
  await env.TANGHULU_DB.prepare(`INSERT INTO ratings (item_id, score, fingerprint)
    SELECT id, ?, ? FROM items WHERE id=?
    ON CONFLICT(item_id, fingerprint) DO UPDATE SET score=excluded.score`).bind(score, fp, id).run();
  return Response.json(await result(id));
};
