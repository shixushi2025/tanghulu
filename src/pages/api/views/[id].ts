import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  const kv = locals.runtime.env.TANGHULU_VIEWS;
  const count = await kv.get(id);
  return Response.json({ count: parseInt(count ?? '0') });
};

export const POST: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  const kv = locals.runtime.env.TANGHULU_VIEWS;
  const current = await kv.get(id);
  const newCount = parseInt(current ?? '0') + 1;
  await kv.put(id, String(newCount));
  return Response.json({ count: newCount });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204 });
};
