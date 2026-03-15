import type { APIRoute } from 'astro';

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const kv = locals.runtime.env.TANGHULU_VIEWS;
  const count = await kv.get(id);
  return Response.json({ count: parseInt(count ?? '0') }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  // Simple rate limit: 1 view per IP per item per hour via KV TTL key
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const kv = locals.runtime.env.TANGHULU_VIEWS;
  const throttleKey = `throttle:${id}:${ip}`;
  const throttled = await kv.get(throttleKey);
  if (!throttled) {
    await kv.put(throttleKey, '1', { expirationTtl: 3600 });
    const current = await kv.get(id);
    const newCount = parseInt(current ?? '0') + 1;
    await kv.put(id, String(newCount));
    return Response.json({ count: newCount });
  }

  const current = await kv.get(id);
  return Response.json({ count: parseInt(current ?? '0') });
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204 });
