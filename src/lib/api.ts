import type { Item } from './types';

export const API_BASE = (import.meta.env.PUBLIC_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchHome() {
  return api<{ featured: Item[]; items: Item[]; counts: Record<string, number> }>('/api/home');
}

export function fetchItems(params?: { category?: string; featured?: boolean }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.featured) query.set('featured', '1');
  const suffix = query.toString() ? `?${query}` : '';
  return api<{ items: Item[]; counts: Record<string, number> }>(`/api/items${suffix}`);
}

export function fetchItem(id: string) {
  return api<{ item: Item }>(`/api/items/${encodeURIComponent(id)}`);
}

export function fetchRelated(id: string) {
  return api<{ items: Item[] }>(`/api/items/${encodeURIComponent(id)}/related`);
}

export function fetchSession() {
  return api<{ ok: boolean }>('/api/admin/session');
}
