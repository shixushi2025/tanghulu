// Only authenticated UI destinations may be resumed after login. Never accept an external redirect.
export function adminDestination(value: string | null): string {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return '/admin/dashboard';
  try {
    const url = new URL(value, 'https://admin.invalid');
    if (url.origin !== 'https://admin.invalid') return '/admin/dashboard';
    if (!/^\/admin\/(?:dashboard|items\/new|items\/[a-zA-Z0-9_-]{1,100}\/edit)\/?$/.test(url.pathname)) return '/admin/dashboard';
    return url.pathname + url.search;
  } catch { return '/admin/dashboard'; }
}
export function adminLoginUrl(destination: string): string {
  return `/admin?next=${encodeURIComponent(adminDestination(destination))}`;
}
