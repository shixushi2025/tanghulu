import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getAllItems } from '../lib/db';
import { visibleCategories } from '../lib/categories';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const items = await getAllItems(env.TANGHULU_DB);

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${origin}/` },
    { loc: `${origin}/about` },
    { loc: `${origin}/search` },
    ...visibleCategories.map(c => ({ loc: `${origin}/category/${c}` })),
    ...items.map(i => ({ loc: `${origin}/item/${i.id}`, lastmod: i.date })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(u => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
