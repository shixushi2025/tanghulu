import { allCategories } from './categories';
import type { Item } from './db';

export const isValidId = (id: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(id);
export function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
export const isCoverUrl = (value: string): boolean => /^\/images\/covers\/[a-z0-9-]+\.webp$/.test(value) || isHttpUrl(value);
export function parseItemInput(value: unknown, existingMood: string[] = [], existingFeatured = false):
  { data: Omit<Item, 'id'> } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: '内容必须是 JSON 对象' };
  const b = value as Record<string, unknown>;
  const limits: Record<string, number> = { title: 160, summary: 600, date: 10, cover: 2048, link: 2048, country: 80, body: 50000, category: 30 };
  const strings: Record<string, string> = {};
  for (const [key, limit] of Object.entries(limits)) {
    const field = b[key] ?? '';
    if (typeof field !== 'string' || field.length > limit) return { error: `${key} 必须是长度不超过 ${limit} 的文本` };
    strings[key] = field.trim();
  }
  const { title, summary, date, cover, link, country, body, category } = strings;
  if (!title || !summary) return { error: '标题和摘要不能为空' };
  if (!allCategories.includes(category as typeof allCategories[number])) return { error: '无效分类' };
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return { error: '请输入有效日期' };
  if (!isCoverUrl(cover) || !isHttpUrl(link)) return { error: '链接须为不含账号密码的 HTTP(S) 地址，封面也可使用本站 /images/covers/ 下的 WebP' };
  function list(value: unknown): string[] | null {
    const values = typeof value === 'string' ? [value] : value ?? [];
    if (!Array.isArray(values) || !values.every(v => typeof v === 'string')) return null;
    const result = [...new Set(values.flatMap(v => v.split(/[,，]/)).map(v => v.trim()).filter(Boolean))];
    return result.length <= 20 && result.every(v => v.length <= 40) ? result : null;
  }
  if (b.featured !== undefined && typeof b.featured !== 'boolean') return { error: '精选必须为布尔值' };
  const featured = b.featured ?? existingFeatured;
  const tags = list(b.tags);
  const mood = list(Object.hasOwn(b, 'mood') ? b.mood : existingMood);
  if (!tags || !mood) return { error: '标签和场景各限 20 个，每个最多 40 字' };
  return { data: { title, summary, date, cover, link, country, body, category, tags, mood, featured } };
}
