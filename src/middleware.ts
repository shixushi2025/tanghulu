import { env } from 'cloudflare:workers';
import { defineMiddleware } from 'astro:middleware';
import { getAdminToken, verifyToken } from './lib/auth';
import { assertSameOrigin, HttpError, secureResponse } from './lib/http';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  let response: Response;
  try {
    if (pathname.startsWith('/api/')) assertSameOrigin(context.request);
    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
    const isPublic = ['/admin', '/admin/', '/api/admin/login'].includes(pathname);
    if (isAdmin && !isPublic) {
      if (!env.ADMIN_PASSWORD) throw new HttpError(503, '管理服务尚未配置');
      const token = getAdminToken(context.request);
      if (!token || !await verifyToken(token, env.ADMIN_PASSWORD)) {
        response = pathname.startsWith('/api/') ? Response.json({ error: '请先登录' }, { status: 401 }) : context.redirect('/admin');
        return secureResponse(response, context.url, import.meta.env.DEV);
      }
    }
    response = await next();
  } catch (error) {
    const known = error instanceof HttpError;
    if (!known) console.error('Request failed', { path: pathname, type: error instanceof Error ? error.name : 'UnknownError' });
    const status = known ? error.status : 503;
    const message = known ? error.message : '服务暂时不可用，请稍后重试';
    response = pathname.startsWith('/api/')
      ? Response.json({ error: message }, { status, headers: status === 429 ? { 'Retry-After': '900' } : {} })
      : new Response('服务暂时不可用，请稍后刷新。', { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return secureResponse(response, context.url, import.meta.env.DEV);
});
