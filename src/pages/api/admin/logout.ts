import type { APIRoute } from 'astro';
import { clearCookie } from '../../../lib/auth';
export const POST: APIRoute = async ({ url }) => Response.json({ ok: true }, {
  headers: { 'Set-Cookie': clearCookie(url.protocol === 'https:') },
});
