import { categoryConfig } from './categories';
import { placeholderIcon } from './placeholders';
import type { Item } from './types';

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function coverAspect(category: string): string {
  if (category === 'film' || category === 'book') return 'aspect-[2/3]';
  if (category === 'tool' || category === 'podcast') return 'aspect-square';
  return 'aspect-[4/3]';
}

function coverInner(item: Pick<Item, 'title' | 'category' | 'cover'>): string {
  const cat = categoryConfig[item.category] ?? categoryConfig.other;
  const media = item.cover
    ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />`
    : `<div class="w-full h-full flex items-center justify-center ${cat.cardPlaceholder}">${placeholderIcon(item.category)}</div>`;

  if (item.category === 'podcast') {
    return `<div class="aspect-square overflow-hidden flex items-center justify-center p-6 ${item.cover ? 'bg-stone-100' : ''}">
      <div class="w-[72%] h-[72%] rounded-full overflow-hidden shadow-sm">${media}</div>
    </div>`;
  }

  return `<div class="${coverAspect(item.category)} overflow-hidden">${media}</div>`;
}

export function itemCardHTML(item: Pick<Item, 'id' | 'title' | 'category' | 'tags' | 'summary' | 'cover' | 'country'>): string {
  const cat = categoryConfig[item.category] ?? categoryConfig.other;
  const tags = (item.tags ?? []).slice(0, 3);
  return `<a href="/item/${escapeHtml(item.id)}" class="group block bg-white rounded-2xl border border-line overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
    ${coverInner(item)}
    <div class="p-4">
      <div class="flex items-center gap-1.5 mb-2">
        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${cat.color} ${cat.bg}">${escapeHtml(cat.label)}</span>
        ${item.country ? `<span class="text-xs text-muted">${escapeHtml(item.country)}</span>` : ''}
      </div>
      <h3 class="font-semibold text-ink leading-tight group-hover:text-brand transition-colors mb-2 line-clamp-1">${escapeHtml(item.title)}</h3>
      <p class="text-sm text-muted leading-relaxed line-clamp-2">${escapeHtml(item.summary)}</p>
      ${
        tags.length
          ? `<div class="flex flex-wrap gap-1 mt-3">${tags
              .map((tag) => `<span class="text-xs text-muted bg-paper px-2 py-0.5 rounded-full">${escapeHtml(tag)}</span>`)
              .join('')}</div>`
          : ''
      }
    </div>
  </a>`;
}

export function itemCardsHTML(items: Pick<Item, 'id' | 'title' | 'category' | 'tags' | 'summary' | 'cover' | 'country'>[]): string {
  return items.map(itemCardHTML).join('');
}
