export function pageNumber(value: string | null): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
export function browseUrl(path: string, category: string, sort: string, page: number): string {
  const params = new URLSearchParams();
  if (category) params.set('cat', category);
  if (sort !== 'newest') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  return `${path}${params.size ? `?${params}` : ''}#collection`;
}
