import { api, load, adminSession, type Item } from './client';
import { requiredElement } from '../lib/dom';
import { isCoverUrl } from '../lib/validation';
import { imageMetadata } from '../lib/images';
import { renderMarkdown } from '../lib/markdown';
import { adminRequest } from './admin-request';
const form = requiredElement('#item-form', HTMLFormElement);
const button = requiredElement('#submit-btn', HTMLButtonElement);
const error = requiredElement('#form-error', HTMLElement);
const title = requiredElement('#f-title', HTMLInputElement);
const id = document.querySelector<HTMLInputElement>('#f-id');
const coverInput = requiredElement('#f-cover', HTMLInputElement);
const coverPreview = requiredElement('#cover-preview', HTMLElement);
const coverStatus = requiredElement('#cover-preview-status', HTMLElement);
const library = requiredElement('#cover-library', HTMLDialogElement);
const libraryOpen = requiredElement('#cover-library-open', HTMLButtonElement);
const libraryQuery = requiredElement('#cover-library-query', HTMLInputElement);
const libraryKind = requiredElement('#cover-library-kind', HTMLSelectElement);
const libraryCards = Array.from(library.querySelectorAll<HTMLElement>('[data-library-card]'));
const libraryButtons = Array.from(library.querySelectorAll<HTMLButtonElement>('[data-cover-src]'));
function filterLibrary() {
  const query = libraryQuery.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of libraryCards) {
    card.hidden = Boolean((libraryKind.value && card.dataset.kind !== libraryKind.value) || !card.dataset.search?.includes(query));
    if (!card.hidden) {
      count++;
      const image = card.querySelector<HTMLImageElement>('img[data-src]');
      if (image && library.open && !image.hasAttribute('src')) image.src = image.dataset.src!;
    }
  }
  requiredElement('#cover-library-count', HTMLElement).textContent = `找到 ${count} 张图片`;
  requiredElement('#cover-library-empty', HTMLElement).hidden = count !== 0;
}
libraryOpen.addEventListener('click', () => { library.showModal(); filterLibrary(); libraryQuery.focus(); });
requiredElement('#cover-library-close', HTMLButtonElement).addEventListener('click', () => library.close());
library.addEventListener('close', () => libraryOpen.focus());
// Search is inside the editor form: Enter must never publish the draft.
libraryQuery.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
libraryQuery.addEventListener('input', filterLibrary);
libraryKind.addEventListener('change', filterLibrary);
requiredElement('#cover-library-reset', HTMLButtonElement).addEventListener('click', () => {
  libraryQuery.value = ''; libraryKind.value = ''; filterLibrary(); libraryQuery.focus();
});
library.querySelectorAll<HTMLImageElement>('img').forEach(image => image.addEventListener('error', () => {
  image.hidden = true;
  const fallback = image.nextElementSibling; if (fallback instanceof HTMLElement) fallback.hidden = false;
}));
let coverRevision = 0;
function previewCover() {
  const revision = ++coverRevision;
  coverPreview.replaceChildren();
  const source = coverInput.value.trim();
  libraryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.coverSrc === source)));
  if (!source) { coverStatus.textContent = '尚未填写封面，将显示分类占位图。'; return; }
  if (!isCoverUrl(source)) { coverStatus.textContent = '请使用站内封面路径或有效的 HTTP(S) 图片地址。'; return; }
  coverStatus.textContent = '正在加载封面…';
  const image = new Image(); image.alt = '当前封面预览'; image.referrerPolicy = 'no-referrer';
  image.addEventListener('load', () => {
    if (revision !== coverRevision) return;
    const metadata = imageMetadata(source);
    coverStatus.textContent = `${image.naturalWidth} × ${image.naturalHeight}${metadata ? ` · ${metadata.provider}` : ' · 请确认图片来源与使用许可'}`;
  }, { once: true });
  image.addEventListener('error', () => {
    if (revision !== coverRevision) return;
    image.remove(); coverStatus.textContent = '图片无法加载，请检查地址。读者将看到分类占位图。';
  }, { once: true });
  image.src = source; coverPreview.append(image);
}
let coverTimer: ReturnType<typeof setTimeout>;
coverInput.addEventListener('input', () => { clearTimeout(coverTimer); coverTimer = setTimeout(previewCover, 300); });
libraryButtons.forEach(button => button.addEventListener('click', () => {
  clearTimeout(coverTimer); coverInput.value = button.dataset.coverSrc!;
  coverInput.dispatchEvent(new Event('input', { bubbles: true }));
  clearTimeout(coverTimer); previewCover(); library.close();
}));
const body = requiredElement('#f-body', HTMLTextAreaElement);
const bodyPreview = requiredElement('#body-preview', HTMLElement);
const previewToggle = requiredElement('#body-preview-toggle', HTMLButtonElement);
let bodyRevision = 0;
async function previewBody() {
  const revision = ++bodyRevision;
  const { html } = await renderMarkdown(body.value);
  if (revision === bodyRevision) bodyPreview.innerHTML = html || '<p>正文还是空的，写点推荐理由吧。</p>';
}
previewToggle.addEventListener('click', () => {
  const expanded = previewToggle.getAttribute('aria-expanded') !== 'true';
  previewToggle.setAttribute('aria-expanded', String(expanded)); bodyPreview.hidden = !expanded;
  previewToggle.textContent = expanded ? '收起预览' : '预览正文';
  if (expanded) void previewBody();
});
let bodyTimer: ReturnType<typeof setTimeout>;
body.addEventListener('input', () => { clearTimeout(bodyTimer); if (!bodyPreview.hidden) bodyTimer = setTimeout(() => { void previewBody(); }, 200); });
const field = (name: string) => {
  const element = document.querySelector(`#f-${name}`);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) throw new Error(`Missing field: ${name}`);
  return element.value.trim();
};
let idManual = false;
id?.addEventListener('input', () => { idManual = true; });
title.addEventListener('input', () => {
  if (id && !id.readOnly && !idManual) id.value = title.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 100);
});
let dirty = false;
form.addEventListener('input', event => { if (event.target instanceof HTMLElement && !library.contains(event.target)) dirty = true; });
window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = '保存中…';
  error.hidden = true;
  error.classList.remove('hidden');
  const itemId = form.dataset.itemId;
  const payload: Record<string, string | boolean> = Object.fromEntries(['title', 'summary', 'body', 'category', 'date', 'country', 'tags', 'mood', 'cover', 'link'].map(name => [name, field(name)]));
  payload.featured = requiredElement('#f-featured', HTMLInputElement).checked;
  if (!itemId) payload.id = field('id');
  try {
    const response = await adminRequest(itemId ? `/api/admin/items/${encodeURIComponent(itemId)}` : '/api/admin/items', {
      method: itemId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(result && typeof result === 'object' && 'error' in result ? String(result.error) : '保存失败');
    dirty = false;
    location.href = `/item/${encodeURIComponent(itemId || String(payload.id))}`;
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : '网络错误，请重试';
    error.hidden = false;
    error.focus();
  } finally { button.disabled = false; button.textContent = itemId ? '保存' : '创建'; }
});

// Disable every input until the session and original item have loaded, preventing stale overwrites.
form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input, select, textarea, button').forEach(field => { field.disabled = true; });
load(async () => {
  await adminSession();
  if (form.hasAttribute('data-edit-form')) {
    const itemId = location.pathname.match(/^\/admin\/items\/([^/]+)\/edit\/?$/)?.[1];
    if (!itemId) throw new Error('无效的编辑地址');
    const { item } = await api<{ item: Item }>(`/api/items/${encodeURIComponent(itemId)}`);
    form.dataset.itemId = item.id;
    for (const name of ['id', 'title', 'summary', 'body', 'category', 'date', 'country', 'tags', 'mood', 'cover', 'link'] as const) {
      const field = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#f-${name}`);
      if (field) field.value = Array.isArray(item[name]) ? (item[name] as string[]).join(', ') : String(item[name]);
    }
    requiredElement('#f-featured', HTMLInputElement).checked = item.featured;
    document.title = `编辑 · ${item.title}`;
    requiredElement('#editing-title', HTMLElement).textContent = item.title;
    const preview = document.querySelector<HTMLAnchorElement>('#published-preview'); if (preview) { preview.href = `/item/${encodeURIComponent(item.id)}`; preview.hidden = false; }
  } else requiredElement('#f-date', HTMLInputElement).value = new Date().toISOString().slice(0, 10);
  previewCover();
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input, select, textarea, button').forEach(field => { field.disabled = false; });
});
