import { defineMiddleware } from 'astro:middleware';
import { getAdminToken, verifyToken } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isPublic =
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname === '/api/admin/login';

  if (!isPublic && (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))) {
    const password = (context.locals as App.Locals).runtime?.env?.ADMIN_PASSWORD;

    if (!password) {
      return pathname.startsWith('/api/')
        ? new Response(JSON.stringify({ error: 'Admin not configured' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        : context.redirect('/admin');
    }

    const token = getAdminToken(context.request);
    const valid = token ? await verifyToken(token, password) : false;

    if (!valid) {
      return pathname.startsWith('/api/')
        ? new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        : context.redirect('/admin');
    }
  }

  return next();
});
