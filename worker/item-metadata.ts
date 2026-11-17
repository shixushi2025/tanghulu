import type { HTMLRewriterElementContentHandlers } from '@cloudflare/workers-types';
import { itemMetadata, type ItemMetadataSource } from '../src/lib/item-metadata';

// Use the runtime global while retaining the project's standard DOM Response type.
declare const HTMLRewriter: { new(): {
  on(selector: string, handlers: HTMLRewriterElementContentHandlers): unknown;
  transform(response: Response): Response;
} };
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');

export function withItemMetadata(response: Response, item: ItemMetadataSource): Response {
  if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) return response;
  const meta = itemMetadata(item);
  const rewriter = new HTMLRewriter();
  rewriter.on('head > title', { element: element => { element.setInnerContent(meta.title); } });
  rewriter.on('head > link[rel="canonical"]', { element: element => {
    element.replace(`<link rel="canonical" href="${escapeAttribute(meta.canonical)}">`, { html: true });
  } });
  const values: Record<string, string | number | undefined> = {
    description: meta.description,
    'og:type': 'article', 'og:title': meta.title, 'og:description': meta.description,
    'og:url': meta.canonical, 'og:image': meta.image, 'og:image:alt': meta.imageAlt,
    'og:image:width': meta.width, 'og:image:height': meta.height,
    'twitter:card': meta.card, 'twitter:title': meta.title,
    'twitter:description': meta.description, 'twitter:image': meta.image, 'twitter:image:alt': meta.imageAlt,
  };
  rewriter.on('head > meta', { element: element => {
    const attribute = element.hasAttribute('property') ? 'property' : 'name';
    const key = element.getAttribute(attribute) ?? '';
    if (!Object.hasOwn(values, key)) return;
    const value = values[key];
    if (value === undefined) element.remove();
    // Attribute values are escaped explicitly; never insert database content as markup.
    else element.replace(`<meta ${attribute}="${key}" content="${escapeAttribute(String(value))}">`, { html: true });
  } });
  const headers = new Headers(response.headers);
  // These validators describe the shared static shell, not the item-specific response.
  for (const name of ['ETag', 'Last-Modified', 'Content-Length', 'Content-MD5', 'Accept-Ranges']) headers.delete(name);
  return rewriter.transform(new Response(response.body, { status: response.status, headers }));
}
