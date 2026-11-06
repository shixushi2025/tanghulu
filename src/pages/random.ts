import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ redirect }) => {
  const row = await env.TANGHULU_DB.prepare('SELECT id FROM items ORDER BY RANDOM() LIMIT 1').first<{ id: string }>();
  return redirect(row ? `/item/${encodeURIComponent(row.id)}` : '/', 302);
};
