import { getAdminToken, verifyToken } from '../src/lib/auth';
import { assertSameOrigin, HttpError, secureResponse } from '../src/lib/http';
import { isValidId } from '../src/lib/validation';
import * as publicApi from './handlers/public';
import * as login from './handlers/login';
import * as logout from './handlers/logout';
import * as create from './handlers/create';
import * as item from './handlers/item';
import * as ratings from './handlers/ratings';
import * as views from './handlers/views';
import type { WorkerRoute } from './types';

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    try {
      if (path.startsWith('/api/')) {
        assertSameOrigin(request);
        if (path.startsWith('/api/admin/') && path !== '/api/admin/login') await requireAdmin(request, env);
        let routes: Record<string, WorkerRoute> = publicApi;
        const params: Record<string, string> = { path: path.slice(5) };
        const match = path.match(/^\/api\/(ratings|views|admin\/items)\/([^/]+)$/);
        if (match) {
          params.id = decodeURIComponent(match[2]);
          routes = match[1] === 'ratings' ? ratings : match[1] === 'views' ? views : item;
        } else if (path === '/api/admin/login') routes = login;
        else if (path === '/api/admin/logout') routes = logout;
        else if (path === '/api/admin/items') routes = create;
        const method = request.method === 'HEAD' ? 'GET' : request.method;
        const handler = Object.hasOwn(routes, method) ? routes[method] : undefined;
        if (!handler) return secureResponse(Response.json({ error: '不支持此请求方法' }, { status: 405, headers: { Allow: Object.keys(routes).join(', ') } }), url);
        const response = secureResponse(await handler({ request, url, params }), url);
        return request.method === 'HEAD' ? new Response(null, response) : response;
      }
      if (!['GET', 'HEAD'].includes(request.method)) throw new HttpError(405, '不支持此请求方法');
      if (path === '/random') {
        const row = await env.TANGHULU_DB.prepare('SELECT id FROM items ORDER BY RANDOM() LIMIT 1').first<{ id: string }>();
        return secureResponse(Response.redirect(new URL(row ? `/item/${encodeURIComponent(row.id)}` : '/', url), 302), url);
      }
      // Only deep links need a small router. HTML itself is built once by Astro.
      if (path.startsWith('/item/')) {
        const id = path.slice(6);
        if (!isValidId(id) || !await env.TANGHULU_DB.prepare('SELECT id FROM items WHERE id=?').bind(id).first()) return errorPage(request, env, 404);
        return shell(request, env, '/item', false);
      }
      if (path.startsWith('/admin/') && path !== '/admin/index.html') {
        try { await requireAdmin(request, env); }
        catch (error) { if (error instanceof HttpError && error.status === 401) return secureResponse(Response.redirect(new URL('/admin', url), 302), url); throw error; }
        const edit = path.match(/^\/admin\/items\/([^/]+)\/edit$/);
        if (edit) {
          if (!isValidId(edit[1])) return errorPage(request, env, 404);
          return shell(request, env, '/admin/edit', true);
        }
      }
      return secureResponse(await env.ASSETS.fetch(request), url);
    } catch (error) {
      const known = error instanceof HttpError;
      if (!known) console.error('Request failed', { path, type: error instanceof Error ? error.name : 'UnknownError' });
      const status = known ? error.status : 503;
      const message = known ? error.message : '服务暂时不可用，请稍后重试';
      return secureResponse(path.startsWith('/api/')
        ? Response.json({ error: message }, { status, headers: status === 429 ? { 'Retry-After': '900' } : {} })
        : new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }), url);
    }
  },
};
async function requireAdmin(request: Request, env: Cloudflare.Env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, '管理服务尚未配置');
  const token = getAdminToken(request);
  if (!token || !await verifyToken(token, env.ADMIN_PASSWORD)) throw new HttpError(401, '请先登录');
}
async function shell(request: Request, env: Cloudflare.Env, pathname: string, admin: boolean) {
  const url = new URL(request.url);
  url.pathname = pathname + '/index.html'; url.search = '';
  const asset = await env.ASSETS.fetch(new Request(url, { method: request.method }));
  // A direct HTML filename can canonicalize. Fetch the canonical shell if needed.
  const response = asset.status >= 300 && asset.status < 400
    ? await env.ASSETS.fetch(new Request(new URL(pathname + '/', url), { method: request.method })) : asset;
  const result = secureResponse(response, new URL(request.url));
  if (admin) result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return result;
}
async function errorPage(request: Request, env: Cloudflare.Env, status: number) {
  const url = new URL('/404.html', request.url);
  const response = await env.ASSETS.fetch(new Request(url));
  return secureResponse(new Response(response.body, { status, headers: response.headers }), new URL(request.url));
}
