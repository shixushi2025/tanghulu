export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertSameOrigin(request: Request): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    throw new HttpError(403, '请求来源无效，请刷新页面后重试');
  }
}

export async function readJson(request: Request, limit = 65536): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415, '请使用 application/json');
  if (Number(request.headers.get('Content-Length')) > limit) throw new HttpError(413, '提交内容过大');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '请求内容为空');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, '提交内容过大'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'JSON 格式错误'); }
}

export function secureResponse(response: Response, url: URL, development = false): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Astro emits inline styles and JSON data blocks; executable scripts are bundled locally.
  headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self'${development ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data:; font-src 'self'; connect-src 'self'${development ? ' ws: wss:' : ''}; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
  headers.set('Cache-Control', 'no-store');
  if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
