import type { WorkerRoute } from '../types';
import { clearCookie } from '../../src/lib/auth';
export const POST: WorkerRoute = async ({ url }) => Response.json({ ok: true }, {
  headers: { 'Set-Cookie': clearCookie(url.protocol === 'https:') },
});
