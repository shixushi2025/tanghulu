import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { getAllItems } from '../lib/db';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const items = (await getAllItems(env.TANGHULU_DB)).slice(0, 30);

  const entries = items
    .map(i => {
      const link = `${origin}/item/${i.id}`;
      const pubDate = new Date(`${i.date}T00:00:00Z`).toUTCString();
      return `    <item>
      <title>${xmlEscape(i.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid>${xmlEscape(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xmlEscape(i.summary)}</description>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>糖葫芦</title>
    <link>${origin}/</link>
    <description>精选那些值得你时间的东西</description>
    <language>zh-CN</language>
${entries}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
