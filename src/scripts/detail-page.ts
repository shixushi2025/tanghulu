import { api, load, template, text, cards, cover, escapeHtml, type Item } from './client';
import { categoryConfig } from '../lib/categories';
import { imageMetadata } from '../lib/images';
import { initializeCovers } from './covers';
import { initializeDetailActions } from './detail-actions';
const id = location.pathname.split('/')[2] ?? '';
load(async () => {
  const { item, html, headings } = await api<{ item: Item; html: string; headings: { id: string; title: string }[] }>(`/api/items/${encodeURIComponent(id)}`);
  const fragment = template('detail-template', { ID: item.id, TITLE: item.title, SUMMARY: item.summary, COUNTRY: item.country, DATE: item.date });
  const cat = categoryConfig[item.category] ?? categoryConfig.other;
  const hero = fragment.querySelector<HTMLElement>('.detail-hero')!;
  hero.style.setProperty('--category-accent', cat.accent); hero.style.setProperty('--category-tint', cat.tint);
  const breadcrumb = fragment.querySelector<HTMLAnchorElement>('.breadcrumbs a:nth-of-type(2)')!;
  breadcrumb.href = `/category/${item.category}`; breadcrumb.textContent = cat.label;
  const pill = fragment.querySelector<HTMLAnchorElement>('.category-pill')!;
  pill.href = breadcrumb.href; pill.textContent = cat.label; pill.style.setProperty('--pill-accent', cat.accent); pill.style.setProperty('--pill-tint', cat.tint);
  text(fragment, '.detail-poster__number', cat.shortLabel); text(fragment, '.detail-poster__category', cat.label);
  fragment.querySelector('.detail-contexts ul')!.innerHTML = item.mood.map(mood => `<li>${escapeHtml(mood)}</li>`).join('');
  fragment.querySelector<HTMLElement>('.detail-contexts')!.hidden = !item.mood.length;
  const external = fragment.querySelector<HTMLAnchorElement>('.detail-actions a')!;
  external.hidden = !item.link; external.href = item.link || '#';
  external.textContent = (item.category === 'tool' ? `打开 ${item.title}` : item.category === 'film' ? '去豆瓣看看' : item.category === 'podcast' ? '去听听' : item.category === 'book' ? '查看这本书' : '打开原页面') + ' ↗';
  // Only the server's sanitized Markdown enters this HTML sink; ordinary text is escaped.
  fragment.querySelector('.detail-article')!.innerHTML = `<p class="reading-meta">约 ${Math.max(1, Math.ceil(item.body.length / 400))} 分钟阅读 · 供你慢慢挑选</p>${html || '<p>这颗内容的详细介绍正在整理中。</p>'}`;
  const navigation = fragment.querySelector<HTMLElement>('.reading-nav')!;
  navigation.hidden = !headings.length;
  navigation.innerHTML = '<h2>这颗的味道</h2>' + headings.map(heading => `<a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.title)}</a>`).join('');
  fragment.querySelector('.detail-tags ul')!.innerHTML = item.tags.map(tag => `<li><a href="/search?q=${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a></li>`).join('');
  cover(fragment, item, true);
  const metadata = imageMetadata(item.cover);
  if (metadata) {
    const credit = document.createElement('figcaption'); credit.className = 'image-credit';
    credit.innerHTML = `${metadata.edition ? escapeHtml(metadata.edition) + ' · ' : ''}<a href="${escapeHtml(metadata.sourcePage)}" target="_blank" rel="noopener noreferrer">图片来源 ↗</a>${metadata.credit ? ` · ${escapeHtml(metadata.credit)} · <a href="${escapeHtml(metadata.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(metadata.license)}</a> · ${escapeHtml(metadata.transformation)}` : ''}`;
    fragment.querySelector('figure.detail-cover')!.append(credit);
  }
  const relatedLink = fragment.querySelector<HTMLAnchorElement>('.related-section .text-link')!;
  relatedLink.href = `/category/${item.category}`; relatedLink.textContent = `逛完${cat.label} →`;
  fragment.querySelector('.related-grid')!.replaceChildren();
  document.querySelector('#detail-content')!.replaceChildren(fragment);
  document.title = `${item.title} · 糖葫芦`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', item.summary);
  const canonical = new URL(`/item/${encodeURIComponent(id)}`, 'https://tanghulu.life').href;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
  for (const [key, value] of [['title', document.title], ['description', item.summary], ['url', canonical]]) document.querySelector(`meta[property="og:${key}"]`)?.setAttribute('content', value);
  initializeCovers(); initializeDetailActions();
  // Related recommendations are optional; their failure must not hide a readable article.
  void api<{ items: Item[] }>(`/api/items/${encodeURIComponent(id)}/related`).then(({ items }) => {
    document.querySelector<HTMLElement>('.related-section')!.hidden = !items.length;
    cards(document.querySelector('.related-grid')!, items);
  }).catch(() => { document.querySelector<HTMLElement>('.related-section')!.hidden = true; });
});
