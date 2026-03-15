import type { APIRoute } from 'astro';

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

async function getRatingResult(db: D1Database, id: string) {
  const result = await db
    .prepare('SELECT AVG(score) as avg, COUNT(*) as count FROM ratings WHERE item_id = ?')
    .bind(id)
    .first();
  return {
    average: result?.avg ? Math.round((result.avg as number) * 10) / 10 : null,
    count: result?.count ?? 0,
  };
}

export const GET: APIRoute = async ({ params, locals }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const db = locals.runtime.env.TANGHULU_DB;
  return Response.json(await getRatingResult(db, id), {
    headers: { 'Cache-Control': 'no-store' },
  });
};

export const POST: APIRoute = async ({ params, locals, request }) => {
  const id = params.id!;
  if (!isValidId(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const score = Number((body as Record<string, unknown>)?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return Response.json({ error: 'Score must be an integer between 1 and 5' }, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const db = locals.runtime.env.TANGHULU_DB;

  await db
    .prepare(
      'INSERT INTO ratings (item_id, score, fingerprint) VALUES (?, ?, ?) ON CONFLICT(item_id, fingerprint) DO UPDATE SET score = excluded.score'
    )
    .bind(id, score, ip)
    .run();

  return Response.json(await getRatingResult(db, id));
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204 });
