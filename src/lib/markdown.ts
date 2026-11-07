import { marked } from 'marked';
import xss, { getDefaultWhiteList } from 'xss';
export async function renderMarkdown(body: string) {
  const headings: { id: string; title: string }[] = [];
  const html = xss(await marked(body), {
    whiteList: { ...getDefaultWhiteList(), a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'] },
    stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style', 'iframe', 'object'],
  }).replace(/<h2>([\s\S]*?)<\/h2>/g, (_, title: string) => {
    const id = `section-${headings.length + 1}`;
    headings.push({ id, title: title.replace(/<[^>]+>/g, '') });
    return `<h2 id="${id}">${title}</h2>`;
  });
  return { html, headings };
}
