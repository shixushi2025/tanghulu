import { requiredElement } from '../lib/dom';
let active: Promise<boolean> | null = null;
function authenticateAgain(): Promise<boolean> {
  if (active) return active;
  const dialog = requiredElement('#session-dialog', HTMLDialogElement);
  const form = requiredElement('#session-form', HTMLFormElement);
  const password = requiredElement('#session-password', HTMLInputElement);
  const button = requiredElement('#session-submit', HTMLButtonElement);
  const error = requiredElement('#session-error', HTMLElement);
  const cancel = requiredElement('#session-cancel', HTMLButtonElement);
  const previousFocus = document.activeElement;
  active = new Promise(resolve => {
    let closed = false;
    const dismiss = () => dialog.close('cancel');
    const submit = async (event: SubmitEvent) => {
      event.preventDefault();
      if (button.disabled || !password.value) return;
      button.disabled = true; error.hidden = true;
      try {
        const request = fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password.value }), signal: AbortSignal.timeout(15000) });
        password.value = '';
        const response = await request;
        if (!response.ok) throw new Error(response.status === 429 ? '登录尝试过于频繁，请稍后再试。' : '密码不正确，请重新输入。');
        if (!closed) dialog.close('authenticated');
      } catch (cause) { if (!closed) { error.textContent = cause instanceof Error ? cause.message : '登录失败，请重试。'; error.hidden = false; password.focus(); } }
      finally { if (!closed) button.disabled = false; }
    };
    dialog.addEventListener('close', () => {
      closed = true;
      password.value = ''; form.removeEventListener('submit', submit); cancel.removeEventListener('click', dismiss);
      active = null; resolve(dialog.returnValue === 'authenticated');
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }, { once: true });
    dialog.returnValue = ''; error.hidden = true; button.disabled = false;
    form.addEventListener('submit', submit); cancel.addEventListener('click', dismiss); dialog.showModal();
  });
  return active;
}
export async function adminRequest(url: string, options: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  // A 401 is issued before a write by the Worker; network errors are never automatically replayed.
  if (response.status !== 401 || !await authenticateAgain()) return response;
  return fetch(url, options);
}
