import type { Item } from '../lib/db';
import { categoryConfig } from '../lib/categories';
import { imageMetadata } from '../lib/images';
import { initializeCovers } from './covers';
export type { Item };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new ApiError(response.status, response.status === 404 ? '这颗内容不存在，或者已经被移走了。' : '内容暂时没有取到，请稍后重试。');
  return response.json();
}
export function load(task: () => Promise<void>) {
  const status = document.getElementById('load-status');
  const retry = document.getElementById('load-retry');
  async function run() {
    retry?.setAttribute('hidden', '');
    if (status) { status.hidden = false; status.textContent = '正在取来这一串内容…'; }
    try { await task(); if (status) status.hidden = true; }
    catch (error) { if (status) status.textContent = error instanceof Error ? error.message : '加载失败'; retry?.removeAttribute('hidden'); }
  }
  retry?.addEventListener('click', run);
  void run();
}
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export function template(id: string, values: Record<string, unknown>): DocumentFragment {
  const source = document.getElementById(id) as HTMLTemplateElement;
  const result = document.createElement('template');
  result.innerHTML = source.innerHTML.replace(/__([A-Z_]+)__/g, (_, key) => escapeHtml(values[key] ?? ''));
  return result.content;
}
export function text(root: ParentNode, selector: string, value: unknown) {
  const element = root.querySelector(selector); if (element) element.textContent = String(value ?? '');
}
export function cover(root: ParentNode, item: Item, detail = false) {
  const media = root.querySelector<HTMLElement>('[data-cover-media]');
  if (!media) return;
  const metadata = imageMetadata(item.cover);
  const kind = metadata?.kind ?? (item.category === 'film' ? 'poster' : item.category === 'book' ? 'book' : 'photo');
  media.className = `cover-media cover-media--${kind}${detail ? ' cover-media--detail' : ''}${['car', 'camera'].includes(item.category) ? ' cover-media--product' : ''}`;
  media.querySelector('.cover-media__image')?.remove();
  if (!item.cover) return;
  const wrapper = document.createElement('div'); wrapper.className = 'cover-media__image';
  const img = document.createElement('img');
  img.alt = metadata?.alt ?? `${item.title}封面`; img.width = metadata?.width ?? 720; img.height = metadata?.height ?? 720;
  img.loading = detail ? 'eager' : 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.fetchPriority = detail ? 'high' : 'auto';
  // Set the listener before assigning src, including immediately cached failures.
  img.addEventListener('error', () => { media.dataset.imageError = 'true'; img.removeAttribute('src'); }, { once: true });
  img.src = item.cover; wrapper.append(img); media.append(wrapper);
}
export function cards(target: Element, items: Item[], featured = false, offset = 0) {
  const fragment = document.createDocumentFragment();
  for (const [index, item] of items.entries()) {
    const card = template('card-template', { TITLE: item.title, SUMMARY: item.summary, ID: item.id, COUNTRY: item.country });
    const element = card.querySelector<HTMLElement>('.item-card')!;
    element.classList.toggle('is-featured', featured);
    const cat = categoryConfig[item.category] ?? categoryConfig.other;
    const pill = card.querySelector<HTMLElement>('.category-pill')!;
    pill.textContent = cat.label; pill.className = `category-pill rounded-full px-2.5 py-1 text-xs font-medium ${cat.color} ${cat.bg}`;
    text(card, '.item-card__number span:last-child', String(offset + index + 1).padStart(2, '0'));
    const poster = card.querySelector<HTMLElement>('.item-card__poster')!;
    poster.className = `item-card__poster relative h-full w-full overflow-hidden ${cat.cardPlaceholder}`;
    const contexts = card.querySelector('.item-card__contexts')!;
    contexts.replaceChildren(...(item.mood.length ? item.mood : item.tags).slice(0, 2).map(label => {
      const li = document.createElement('li'); li.className = 'context-pill rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-500'; li.textContent = label; return li;
    }));
    cover(card, item); fragment.append(card);
  }
  target.replaceChildren(fragment); initializeCovers();
}
export async function adminSession() {
  try { await api('/api/admin/session'); }
  catch (error) { if (error instanceof ApiError && error.status === 401) location.replace('/admin'); throw error; }
}
