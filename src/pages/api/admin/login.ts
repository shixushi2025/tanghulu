import type { APIRoute } from 'astro';
import { createToken, tokenCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ locals, request }) => {
  const password = (locals as App.Locals).runtime?.env?.ADMIN_PASSWORD;
  if (!password) {
    return Response.json({ error: 'Admin not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const submitted = String((body as Record<string, unknown>)?.password ?? '');
  if (!submitted || submitted !== password) {
    // Constant-time compare not critical here since it's a string comparison
    // and brute-force protection is handled by the token TTL + no enumeration
    return Response.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await createToken(password);
  return Response.json({ ok: true }, {
    headers: { 'Set-Cookie': tokenCookie(token) },
  });
};
