import { api, load, adminSession, escapeHtml, type Item } from './client';
import { allCategories, categoryConfig } from '../lib/categories';
import { requiredElement } from '../lib/dom';
const query = new URLSearchParams(location.search);
const filters = document.querySelector<HTMLFormElement>('.admin-filters')!;
for (const name of ['q', 'cat', 'coverage', 'featured', 'sort']) {
  const field = filters.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
  if (query.has(name)) field.value = query.get(name)!;
}
const table = document.querySelector('tbody')!;
const modal = requiredElement('#modal', HTMLDialogElement);
const title = requiredElement('#modal-title', HTMLElement);
const confirm = requiredElement('#modal-confirm', HTMLButtonElement);
const error = requiredElement('#delete-error', HTMLElement);
let pendingId = '';
let pendingButton: HTMLButtonElement | null = null;
table.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('.delete-btn');
  if (!button) return;
  pendingButton = button; pendingId = button.dataset.id ?? '';
  title.textContent = button.dataset.title ?? ''; error.hidden = true; modal.showModal();
});
modal.addEventListener('close', () => pendingButton?.focus());
const pageUrl = (page: number) => { const next = new URLSearchParams(query); next.set('page', String(page)); return `/admin/dashboard?${next}#library-title`; };
load(async () => {
  await adminSession();
  const [collection, overview] = await Promise.all([
    api<{ items: Item[]; total: number; page: number; pages: number }>(`/api/admin/collection?${query}`),
    api<{ total: number; withCover: number; featured: number; counts: Record<string, number> }>('/api/admin/overview'),
  ]);
  const metrics = { ...overview, missing: overview.total - overview.withCover };
  for (const key of ['total', 'featured', 'withCover', 'missing'] as const) requiredElement(`[data-metric="${key}"]`, HTMLElement).textContent = String(metrics[key]);
  const maximum = Math.max(1, ...Object.values(overview.counts));
  for (const category of allCategories) {
    const count = overview.counts[category] ?? 0;
    requiredElement(`[data-admin-count="${category}"]`, HTMLElement).textContent = String(count);
    requiredElement(`[data-bar="${category}"]`, HTMLElement).style.width = `${count / maximum * 100}%`;
    const link = document.querySelector<HTMLAnchorElement>(`#category-chart a[href$="cat=${category}"]`)!;
    if (query.get('cat') === category) link.setAttribute('aria-current', 'page');
  }
  const percent = overview.total ? Math.round(overview.withCover / overview.total * 100) : 0;
  requiredElement('#coverage-summary', HTMLElement).textContent = `${overview.withCover} / ${overview.total} 条已配封面 · ${percent}%`;
  requiredElement('#coverage-progress', HTMLProgressElement).value = percent;
  requiredElement('#result-count', HTMLElement).textContent = `找到 ${collection.total} 条 · 第 ${collection.page} / ${collection.pages} 页`;
  table.innerHTML = collection.items.length ? collection.items.map(item => `<tr>
    <td><div class="admin-row-content"><span class="admin-thumb" data-thumb="${escapeHtml(item.id)}" aria-hidden="true">${escapeHtml(categoryConfig[item.category]?.shortLabel ?? '藏')}</span><div><a href="/item/${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a><small>${escapeHtml(item.id)}</small></div></div></td>
    <td>${escapeHtml(categoryConfig[item.category]?.label ?? item.category)}<div class="admin-tags">${item.featured ? '<span class="admin-tag">精选</span>' : ''}${!item.cover ? '<span class="admin-tag admin-tag--missing">待补封面</span>' : ''}</div></td>
    <td class="admin-date">${escapeHtml(item.date)}</td>
    <td><div class="admin-row-actions"><a href="/admin/items/${encodeURIComponent(item.id)}/edit" aria-label="编辑 ${escapeHtml(item.title)}">编辑</a><button class="delete-btn" data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}">删除</button></div></td>
  </tr>`).join('') : '<tr><td colspan="4" class="admin-empty">没有符合筛选条件的内容。<br><a href="/admin/dashboard">清除筛选，查看全部内容</a></td></tr>';
  const thumbs = new Map(Array.from(table.querySelectorAll<HTMLElement>('[data-thumb]'), element => [element.dataset.thumb!, element]));
  for (const item of collection.items) {
    if (!item.cover) continue;
    const target = thumbs.get(item.id)!;
    const image = new Image(); image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => { image.remove(); target.textContent = '失效'; target.title = '封面无法加载，请检查地址'; }, { once: true });
    image.src = item.cover; target.replaceChildren(image);
  }
  requiredElement('#admin-pagination', HTMLElement).innerHTML = `<span>每页 12 条 · 共 ${collection.total} 条</span><div>${collection.page > 1 ? `<a class="button button--secondary" href="${escapeHtml(pageUrl(collection.page - 1))}" rel="prev">← 上一页</a>` : ''}${collection.page < collection.pages ? `<a class="button button--primary" href="${escapeHtml(pageUrl(collection.page + 1))}" rel="next">下一页 →</a>` : ''}</div>`;
});
requiredElement('#modal-cancel', HTMLButtonElement).addEventListener('click', () => modal.close());
confirm.addEventListener('click', async () => {
  if (!pendingId || confirm.disabled) return;
  confirm.disabled = true; confirm.textContent = '删除中…';
  try {
    const response = await fetch(`/api/admin/items/${encodeURIComponent(pendingId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('删除失败，请检查登录状态后重试。');
    location.reload();
  } catch (cause) { error.textContent = cause instanceof Error ? cause.message : '网络错误'; error.hidden = false; }
  finally { confirm.disabled = false; confirm.textContent = '确认删除'; }
});
const logout = requiredElement('#logout-btn', HTMLButtonElement);
logout.addEventListener('click', async () => {
  logout.disabled = true;
  try {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (!response.ok) throw new Error();
    location.href = '/admin';
  } catch { logout.textContent = '退出失败，点击重试'; logout.disabled = false; }
});
