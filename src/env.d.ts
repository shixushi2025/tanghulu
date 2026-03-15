/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare module 'cloudflare:workers' {
  interface Env {
    TANGHULU_DB: D1Database;
    TANGHULU_VIEWS: KVNamespace;
    ADMIN_PASSWORD: string;
  }
}
