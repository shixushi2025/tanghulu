import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { createItem, getItemById } from '../../../../lib/db';
import { isValidId, parseItemInput } from '../../../../lib/validation';
import { HttpError, readJson } from '../../../../lib/http';

export const POST: APIRoute = async ({ request }) => {
  const body = await readJson(request, 200000);
  const id = body && typeof body === 'object' && 'id' in body ? body.id : null;
  if (typeof id !== 'string' || !isValidId(id)) throw new HttpError(400, '无效 ID');
  const parsed = parseItemInput(body);
  if ('error' in parsed) throw new HttpError(400, parsed.error);
  if (await getItemById(env.TANGHULU_DB, id)) throw new HttpError(409, 'ID 已存在');
  try { await createItem(env.TANGHULU_DB, id, parsed.data); }
  catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) throw new HttpError(409, 'ID 已存在');
    throw error;
  }
  return Response.json({ ok: true, id }, { status: 201 });
};
