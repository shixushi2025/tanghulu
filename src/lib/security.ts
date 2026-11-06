import { HttpError } from './http';

export async function fingerprint(request: Request, secret: string, purpose: string): Promise<string> {
  if (!secret) throw new HttpError(503, '互动服务尚未配置');
  // CF overwrites this header at the edge. Local development intentionally shares a bucket.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${purpose}:${ip}`));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export async function rateLimit(db: D1Database, key: string, limit: number, seconds: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / seconds);
  const row = await db.prepare(`INSERT INTO rate_limits (key, bucket, attempts, expires_at) VALUES (?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET bucket=excluded.bucket,
    attempts=CASE WHEN rate_limits.bucket=excluded.bucket THEN rate_limits.attempts+1 ELSE 1 END,
    expires_at=excluded.expires_at RETURNING attempts`).bind(key, bucket, (bucket + 1) * seconds).first<{ attempts: number }>();
  await db.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at < ? LIMIT 100)').bind(now).run();
  if (!row || row.attempts > limit) throw new HttpError(429, '操作太频繁，请稍后再试');
}
