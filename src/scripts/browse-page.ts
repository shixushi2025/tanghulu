import { api, load, cards, escapeHtml, type Item } from './client';
import { allCategories, categoryConfig } from '../lib/categories';
import { browseUrl } from '../lib/browse';
const query = new URLSearchParams(location.search);
const categoryPage = location.pathname.match(/^\/category\/([^/]+)/)?.[1];
const requested = categoryPage ?? query.get('cat') ?? '';
const category = allCategories.includes(requested as typeof allCategories[number]) ? requested : '';
const sort = ['newest', 'oldest', 'title'].includes(query.get('sort') ?? '') ? query.get('sort')! : 'newest';
query.set('cat', category); query.set('sort', sort);
if (!categoryPage) {
  const select = document.querySelector<HTMLSelectElement>('#sort')!;
  select.value = sort; select.disabled = false;
  document.querySelector<HTMLButtonElement>('.collection-toolbar button')!.disabled = false;
  if (category) { const input = document.createElement('input'); input.type = 'hidden'; input.name = 'cat'; input.value = category; document.querySelector('.collection-toolbar')!.append(input); }
}
load(async () => {
  const [collection, home] = await Promise.all([
    api<{ items: Item[]; total: number; page: number; pages: number }>(`/api/collection?${query}`),
    categoryPage ? Promise.resolve(null) : api<{ featured: Item[]; counts: Record<string, number> }>('/api/featured'),
  ]);
  cards(document.querySelector(categoryPage ? '.category-grid' : '#collection .collection-grid')!, collection.items, false, (collection.page - 1) * 12);
  document.querySelector('#collection-empty')?.toggleAttribute('hidden', collection.total > 0);
  document.querySelectorAll('[data-collection-total]').forEach(element => { element.textContent = String(collection.total); });
  if (home) {
    const total = Object.values(home.counts).reduce((sum, value) => sum + value, 0);
    cards(document.querySelector('.featured-grid')!, home.featured, true);
    document.querySelectorAll('[data-total]').forEach(element => { element.textContent = String(total); });
    document.querySelector('[data-category-count]')!.textContent = String(Object.keys(home.counts).length);
    document.querySelector('[data-featured-count]')!.textContent = String(home.featured.length);
    document.querySelectorAll<HTMLElement>('[data-count]').forEach(element => {
      const key = element.dataset.count!; element.textContent = String(key ? home.counts[key] ?? 0 : total);
      const link = element.closest('a')!;
      link.href = browseUrl('/', key, sort, 1); link.classList.toggle('is-active', key === category);
      key === category ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
    });
    document.querySelector('#collection-count')!.textContent = `${category ? categoryConfig[category].label : '全部精选'} · ${collection.total} 颗，慢慢挑`;
  }
  const path = categoryPage ? `/category/${categoryPage}` : '/';
  const url = (page: number) => escapeHtml(browseUrl(path, categoryPage ? '' : category, sort, page));
  document.querySelector('.pagination')!.innerHTML = `<span>共 ${collection.total} 颗 · 第 ${collection.page} / ${collection.pages} 页</span><div>${collection.page > 1 ? `<a class="button button--secondary" href="${url(collection.page - 1)}" rel="prev">← 上一页</a>` : ''}${collection.page < collection.pages ? `<a class="button button--primary" href="${url(collection.page + 1)}" rel="next">下一页 →</a>` : ''}</div>`;
});
