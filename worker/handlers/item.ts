import { env } from 'cloudflare:workers';
import type { WorkerRoute } from '../types';
import { updateItem, deleteItem, getItemById } from '../../src/lib/db';
import { isValidId, parseItemInput } from '../../src/lib/validation';
import { HttpError, readJson } from '../../src/lib/http';

export const PUT: WorkerRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!isValidId(id)) throw new HttpError(400, '无效 ID');
  const body = await readJson(request, 200000);
  const existing = await getItemById(env.TANGHULU_DB, id);
  if (!existing) throw new HttpError(404, '内容不存在');
  const parsed = parseItemInput(body, existing.mood, existing.featured);
  if ('error' in parsed) throw new HttpError(400, parsed.error);
  await updateItem(env.TANGHULU_DB, id, parsed.data);
  return Response.json({ ok: true });
};
export const DELETE: WorkerRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!isValidId(id)) throw new HttpError(400, '无效 ID');
  if (!await getItemById(env.TANGHULU_DB, id)) throw new HttpError(404, '内容不存在');
  await deleteItem(env.TANGHULU_DB, id);
  await env.TANGHULU_VIEWS.delete(id);
  return Response.json({ ok: true });
};
