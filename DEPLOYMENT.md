# 部署说明（单一 Cloudflare Worker）

一个 Worker 同时提供：

- **静态/CSR 前端**（Astro `output: 'static'` → `./dist`，Workers Static Assets）
- **`/api/*`**（D1 条目、KV 浏览次数、admin、评分、sitemap）

没有 Cloudflare Pages。一次 `wrangler deploy` 上传 Worker 脚本和静态资源。

配置对齐官方 SPA + API 模式：

- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/

```toml
name = "tanghulu"
main = "./worker/src/index.ts"
compatibility_date = "2026-03-12"

assets = { directory = "./dist", binding = "ASSETS", not_found_handling = "single-page-application", run_worker_first = ["/api/*", "/item/*", "/admin/items/*/edit"] }
```

- `/api/*`：先跑 Worker（Hono）
- 已生成的 HTML（`/`、`/about`、`/category/film`、`/search`、`/admin`…）：直接当静态资源
- 未匹配的导航：SPA 回退到站点根 `index.html`
- `/item/:slug` 和 `/admin/items/:id/edit`：Worker 用 `ASSETS.fetch` 送到对应 CSR 壳页（SPA 回退永远是根 `index.html`，不能当条目页）

---

## 部署

```bash
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
# 即: astro build && wrangler deploy
```

Workers 控制台给 `tanghulu` 绑自定义域 `tanghulu.life`（以及 `www`，如需要）。不要再建 Pages 项目，也不要给旧的 `tanghulu-api` / Pages 绑这个域。

若生产还停在 Pages 或独立 `tanghulu-api`：先把本 Worker 的域切过来，再关掉 Pages 项目和多余的 `/api*` route。D1 / KV 仍用原来的 `tanghulu-db` 和 `TANGHULU_VIEWS`。

---

## D1 迁移

已有库只需要 **0004**（`featured` 列 + 初始精选）：

```bash
npm run db:migrate:remote
```

全新本地库：

```bash
npm run db:migrate:local
```

`featured` 列尚未存在时，Worker 用内置 ID 填满首页「精选」，公开页不会 500。后台勾选精选会在缺列时失败，所以生产请跑 0004。

从 Markdown 重新灌库（`INSERT OR REPLACE`，**必须先有 featured 列**）：

```bash
node scripts/migrate-content.mjs
npx wrangler d1 execute tanghulu-db --remote --file=migrations/0003_seed.sql
```

历史 `migrations/0003_seed.sql` 不含 `featured`；新生成的 seed 会带上。

---

## 本地开发

前端热更新（Astro :4321 把 `/api` 代理到 Worker :8787）：

```bash
npm run db:migrate:local   # 首次；配置已从 worker/wrangler.toml 挪到仓库根 wrangler.toml
npm run dev:api            # Worker :8787
npm run dev                # Astro :4321
```

和生产相同的单一进程（先 build，再由 Worker 托管 `dist/` + `/api`）：

```bash
npm run preview            # astro build && wrangler dev
# 打开 http://localhost:8787
```

---

## 不要再做的事

- 不要用 Cloudflare Pages，不要设 `pages_build_output_dir`
- 不要加回 `@astrojs/cloudflare` adapter / `output: 'server'`
- 不要依赖 `public/_redirects`（那是 Pages）；条目壳页由 Worker + `ASSETS` 处理
- 不要再跑 `scripts/fix-deploy.mjs` 或生成 `_worker.js`
