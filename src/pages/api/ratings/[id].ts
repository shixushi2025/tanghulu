import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  const db = locals.runtime.env.TANGHULU_DB;

  const result = await db
    .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
    .bind(id)
    .first();

  return Response.json({
    average: result?.avg ? Math.round((result.avg as number) * 10) / 10 : null,
    count: result?.count ?? 0,
  });
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const id = params.id!;
  const db = locals.runtime.env.TANGHULU_DB;

  const body = await request.json();
  const score = Number(body.score);

  if (!score || score < 1 || score > 5) {
    return Response.json({ error: 'Invalid score' }, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  await db
    .prepare(`
      INSERT INTO ratings (item_id, score, fingerprint) VALUES (?, ?, ?)
      ON CONFLICT(item_id, fingerprint) DO UPDATE SET score = excluded.score
    `)
    .bind(id, score, ip)
    .run();

  const result = await db
    .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
    .bind(id)
    .first();

  return Response.json({
    average: result?.avg ? Math.round((result.avg as number) * 10) / 10 : null,
    count: result?.count ?? 0,
  });
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204 });
};
