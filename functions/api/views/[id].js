const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export async function onRequest(ctx) {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS });
  }

  const id = ctx.params.id;

  if (ctx.request.method === 'GET') {
    const count = await ctx.env.TANGHULU_VIEWS.get(id);
    return Response.json({ count: parseInt(count ?? '0') }, { headers: HEADERS });
  }

  if (ctx.request.method === 'POST') {
    const current = await ctx.env.TANGHULU_VIEWS.get(id);
    const newCount = parseInt(current ?? '0') + 1;
    await ctx.env.TANGHULU_VIEWS.put(id, String(newCount));
    return Response.json({ count: newCount }, { headers: HEADERS });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
