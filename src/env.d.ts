/// <reference types="astro/client" />
import type { D1Database as Database, KVNamespace as Namespace } from '@cloudflare/workers-types';
declare global {
  type D1Database = Database;
  type KVNamespace = Namespace;
  namespace Cloudflare {
    interface Env {
      TANGHULU_DB: Database;
      TANGHULU_VIEWS: Namespace;
      ADMIN_PASSWORD: string;
      VISITOR_HASH_SECRET: string;
    }
  }
}
