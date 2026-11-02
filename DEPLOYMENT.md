# 部署说明（静态站 + 独立 API Worker）

公开站不再走 Astro `output: 'server'` / Cloudflare Pages SSR。内容读写都经独立 Worker。

| 部分 | 平台 | 职责 |
|------|------|------|
| **Frontend** | Cloudflare Pages | Astro `output: 'static'`，目录 `dist/`。首页/分类/条目/后台为静态壳 + 浏览器请求 `/api`。 |
| **API** | Cloudflare Worker `tanghulu-api` | D1、KV、admin cookie、评分、浏览次数、sitemap。 |

内容模型不变：条目仍在 D1 `items` 表（Markdown 只用于 seed）。后台改条目后，公开页下次请求 API 即可看到，不必重建 Pages。

---

## 1. API Worker

配置：`worker/wrangler.toml`（bindings：`TANGHULU_DB`、`TANGHULU_VIEWS`）。

```bash
# 首次：把 Pages 上的 ADMIN_PASSWORD 迁到 Worker secret
npx wrangler secret put ADMIN_PASSWORD --config worker/wrangler.toml

# 部署 Worker
npm run deploy:api
```

### 同域路由（推荐，cookie 最简单）

Pages 占用 `tanghulu.life`。再给 Worker 加一条 route，让 `/api*` 优先生效：

1. Workers → `tanghulu-api` → Triggers → Add route
2. Route：`tanghulu.life/api*`
3. 如有 `www`，同样加 `www.tanghulu.life/api*`

前端默认 `fetch('/api/...')`（`PUBLIC_API_URL` 留空）。Admin `HttpOnly` cookie `Path=/` 对 Pages 和 `/api` 都有效。

备选：Worker 自定义域 `api.tanghulu.life`，Pages 环境变量 `PUBLIC_API_URL=https://api.tanghulu.life`。Worker 已允许该 CORS origin。Cookie 需 `Domain=.tanghulu.life`（当前实现按同域 Path=/ 来写，走子域时要改 `worker/src/auth.ts`）。

### D1 迁移

已有库只需要 **0004**（`featured` 列 + 6 条初始精选）：

```bash
npm run db:migrate:remote
# 即: wrangler d1 execute tanghulu-db --remote --config worker/wrangler.toml --file=migrations/0004_featured.sql
```

全新本地库：

```bash
npm run db:migrate:local
```

若 `featured` 列尚未存在：Worker 仍用 `SELECT *` + 内置 fallback ID 填满首页「精选」，公开页不会 500。后台勾选精选会在缺列时写入失败，所以生产请跑 0004。

从 Markdown 重新灌库（会 `INSERT OR REPLACE`，**必须先有 featured 列**）：

```bash
node scripts/migrate-content.mjs
npx wrangler d1 execute tanghulu-db --remote --config worker/wrangler.toml --file=migrations/0003_seed.sql
```

历史 `migrations/0003_seed.sql` 不含 `featured`；新生成的 seed 会带上。不要在未跑 0004 的库上执行带 `featured` 的 INSERT。

---

## 2. Cloudflare Pages（静态前端）

- **Build command**: `npm run build`（就是 `astro build`，不再跑 `scripts/fix-deploy.mjs`）
- **Output directory**: `dist`
- **Root `wrangler.toml`**: 只有 `pages_build_output_dir`，**没有** D1/KV。请在 Pages 项目里去掉旧的 `TANGHULU_DB` / `TANGHULU_VIEWS` / `ADMIN_PASSWORD` bindings（密码改绑 Worker）。
- 构建不需要 `PUBLIC_API_URL`（同域 `/api`）。
- `public/_redirects`：`/item/:slug` → `/item/index.html`，`/admin/items/:id/edit` → `/admin/edit.html`。

旧的 `_worker.js` / `dist/server` / Pages Functions SSR 路径已删除。不要再启用 Astro Cloudflare adapter。

---

## 本地开发

两个进程：

```bash
npm run db:migrate:local   # 首次
npm run dev:api            # Worker :8787
npm run dev                # Astro :4321，/api 代理到 8787
```

打开 http://localhost:4321 。条目 URL `/item/chatgpt` 由 Vite 中间件回写到 `src/pages/item/index.astro`。

---

## 遇到的问题和解决方案（历史 SSR，已废弃）

下列问题属于 **Astro v6 + `@astrojs/cloudflare` Pages SSR**。本仓库已切走，不必再修 `fix-deploy.mjs` / `_worker.js`：

1. `@astrojs/tailwind` 不兼容 Astro v6 → 前端仍用 `@tailwindcss/vite`
2. Content Collection `slug` → `id`
3. CF Pages 读取适配器 `wrangler.json` 字段非法
4. `functions/` 与 SSR Worker 冲突
5. `Astro.locals.runtime.env` 在 Astro v6 移除

若误把 adapter 加回来，上述问题会全部回来。保持 `output: 'static'` + 独立 Worker。
