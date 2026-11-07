import { env } from 'cloudflare:workers';
import type { WorkerRoute } from '../types';
import { createToken, passwordMatches, tokenCookie } from '../../src/lib/auth';
import { HttpError, readJson } from '../../src/lib/http';
import { fingerprint, rateLimit } from '../../src/lib/security';

export const POST: WorkerRoute = async ({ request, url }) => {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, '管理服务尚未配置');
  const key = await fingerprint(request, env.ADMIN_PASSWORD, 'login');
  await rateLimit(env.TANGHULU_DB, `login:${key}`, 10, 900);
  const body = await readJson(request, 2048);
  const submitted = body && typeof body === 'object' && 'password' in body ? body.password : null;
  if (typeof submitted !== 'string' || !submitted || !await passwordMatches(submitted, env.ADMIN_PASSWORD)) throw new HttpError(401, '密码不正确');
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': tokenCookie(await createToken(env.ADMIN_PASSWORD), url.protocol === 'https:') } });
};
