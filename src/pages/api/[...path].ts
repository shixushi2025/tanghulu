import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getAllItems, getItemById, getItemsByCategory, getFeaturedItems, getRelatedItems, countByCategory } from '../../lib/db';
import { allCategories, visibleCategories } from '../../lib/categories';
import { HttpError } from '../../lib/http';
import { isValidId } from '../../lib/validation';

// Preserve public API URLs from the previous Worker while SSR and API share services.
export const GET: APIRoute = async ({ params, url }) => {
  const path = params.path ?? '';
  const db = env.TANGHULU_DB;
  if (path === 'health' || path === 'admin/session') return Response.json({ ok: true });
  if (path === 'home') {
    const [items, featured, counts] = await Promise.all([getAllItems(db), getFeaturedItems(db), countByCategory(db)]);
    return Response.json({ items, featured, counts });
  }
  if (path === 'stats') {
    const counts = await countByCategory(db);
    return Response.json({ counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) });
  }
  if (path === 'items') {
    const category = url.searchParams.get('category');
    if (category && !allCategories.includes(category as typeof allCategories[number])) throw new HttpError(400, '无效分类');
    const items = category ? await getItemsByCategory(db, category) : await getAllItems(db);
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
    const selected = items.filter(item => item.featured);
    return Response.json({ items: url.searchParams.get('featured') === '1' ? (selected.length ? selected : items).slice(0, 6) : items, counts });
  }
  const match = path.match(/^items\/([^/]+)(\/related)?$/);
  if (match) {
    const id = match[1];
    if (!isValidId(id)) throw new HttpError(400, '无效 ID');
    const item = await getItemById(db, id);
    if (!item) throw new HttpError(404, '内容不存在');
    return Response.json(match[2] ? { items: await getRelatedItems(db, item.category, id) } : { item });
  }
  if (path === 'sitemap.xml') {
    const items = await getAllItems(db);
    const paths = ['/', '/about', '/search', ...visibleCategories.map(category => `/category/${category}`), ...items.map(item => `/item/${encodeURIComponent(item.id)}`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>https://tanghulu.life${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  }
  throw new HttpError(404, '接口不存在');
};
