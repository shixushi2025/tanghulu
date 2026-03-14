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
    const result = await ctx.env.TANGHULU_DB
      .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
      .bind(id)
      .first();

    return Response.json({
      average: result?.avg ? Math.round(result.avg * 10) / 10 : null,
      count: result?.count ?? 0,
    }, { headers: HEADERS });
  }

  if (ctx.request.method === 'POST') {
    const body = await ctx.request.json();
    const score = Number(body.score);

    if (!score || score < 1 || score > 5) {
      return Response.json({ error: 'Invalid score' }, { status: 400, headers: HEADERS });
    }

    const ip = ctx.request.headers.get('CF-Connecting-IP') ?? 'unknown';

    await ctx.env.TANGHULU_DB
      .prepare(`
        INSERT INTO ratings (item_id, score, fingerprint) VALUES (?, ?, ?)
        ON CONFLICT(item_id, fingerprint) DO UPDATE SET score = excluded.score
      `)
      .bind(id, score, ip)
      .run();

    const result = await ctx.env.TANGHULU_DB
      .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
      .bind(id)
      .first();

    return Response.json({
      average: result?.avg ? Math.round(result.avg * 10) / 10 : null,
      count: result?.count ?? 0,
    }, { headers: HEADERS });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
