import type { APIRoute } from 'astro';
import { clearCookie } from '../../../lib/auth';

export const POST: APIRoute = async () => {
  return Response.json({ ok: true }, {
    headers: { 'Set-Cookie': clearCookie() },
  });
};
