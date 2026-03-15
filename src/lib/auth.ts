const COOKIE_NAME = 'admin_tok';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromb64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

export async function createToken(password: string): Promise<string> {
  const expiry = String(Date.now() + TOKEN_TTL_MS);
  const key = await getKey(password);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiry));
  return `${btoa(expiry).replace(/=/g, '')}.${b64url(sig)}`;
}

export async function verifyToken(token: string, password: string): Promise<boolean> {
  try {
    const dot = token.indexOf('.');
    if (dot === -1) return false;
    const expiry = atob(token.slice(0, dot));
    if (Date.now() > parseInt(expiry)) return false;
    const key = await getKey(password);
    const sig = fromb64url(token.slice(dot + 1));
    return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(expiry));
  } catch {
    return false;
  }
}

export function getAdminToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)admin_tok=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function tokenCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 3600}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
