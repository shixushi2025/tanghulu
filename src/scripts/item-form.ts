import { requiredElement } from '../lib/dom';
const form = requiredElement('#item-form', HTMLFormElement);
const button = requiredElement('#submit-btn', HTMLButtonElement);
const error = requiredElement('#form-error', HTMLElement);
const title = requiredElement('#f-title', HTMLInputElement);
const id = document.querySelector<HTMLInputElement>('#f-id');
const field = (name: string) => {
  const element = document.querySelector(`#f-${name}`);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) throw new Error(`Missing field: ${name}`);
  return element.value.trim();
};
let idManual = false;
id?.addEventListener('input', () => { idManual = true; });
title.addEventListener('input', () => {
  if (id && !idManual) id.value = title.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 100);
});
let dirty = false;
form.addEventListener('input', () => { dirty = true; });
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
    const response = await fetch(itemId ? `/api/admin/items/${encodeURIComponent(itemId)}` : '/api/admin/items', {
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
