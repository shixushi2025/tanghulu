# 部署说明（Cloudflare Pages + Astro v6 SSR）

## 技术栈

- **框架**: Astro v6 (`output: 'server'`)
- **适配器**: `@astrojs/cloudflare` v13+
- **部署平台**: Cloudflare Pages
- **数据库**: Cloudflare D1 (`tanghulu-db`, binding: `TANGHULU_DB`)
- **KV**: Cloudflare KV (binding: `TANGHULU_VIEWS`)

---

## 构建命令

```bash
npm run build
# 等价于: astro build && node scripts/fix-deploy.mjs
```

`scripts/fix-deploy.mjs` 做了三件事：
1. 把 `dist/client/` 的静态资源拍平到 `dist/` 根目录（保证 URL 路径正确）
2. 用 esbuild 把 `dist/server/entry.mjs` 打包成 `dist/_worker.js`（CF Pages Advanced Mode 要求单文件）
3. 删除 `.wrangler/deploy/` 目录，避免 CF Pages 读取冲突配置

---

## 遇到的问题和解决方案

### 1. `@astrojs/tailwind` 不兼容 Astro v6
**错误**: peer dependency conflict
**原因**: `@astrojs/tailwind` 只支持 Astro ≤5
**解决**: 改用 `@tailwindcss/vite` 插件直接集成 Tailwind v4

```js
// astro.config.mjs
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
});
```

---

### 2. Content Collection `slug` → `id`
**错误**: `item.slug` 找不到
**原因**: Astro v6 新 Content Loader API 改用 `id` 替代 `slug`
**解决**: 全局替换 `item.slug` → `item.id`

---

### 3. CF Pages 部署时读取了适配器生成的 `wrangler.json`（多次迭代）

**背景**: `@astrojs/cloudflare` 适配器构建时会生成两个文件：
- `.wrangler/deploy/config.json` — 重定向配置，告诉 CF Pages 使用生成的 wrangler.json
- `dist/server/wrangler.json` — 实际部署配置

CF Pages 读取 `dist/server/wrangler.json` 后报错，因为该文件包含大量 CF Workers 专用字段，在 Pages 环境下非法。

**错误一**: `triggers: {}` 格式非法（Pages 要求 `{ crons: [] }`）
**错误二**: `kv_namespaces[0]` 没有 `id` 字段（SESSION binding，适配器自动添加）
**错误三**: `ASSETS` 是 Pages 保留名称
**错误四**: 不能同时存在 `main` 和 `pages_build_output_dir`
**错误五**: Pages 不支持 `rules`、`no_bundle` 字段

**最终解决**: 完全绕开生成的 `wrangler.json`，改用 **CF Pages Advanced Mode**：
- 在 `dist/` 根目录放 `_worker.js`，CF Pages 自动检测并使用它处理 SSR 请求
- `_worker.js` 必须是单个打包文件（用 esbuild 打包），不能依赖运行时模块解析
- `wrangler.toml` 只保留 `pages_build_output_dir`，不需要 `main`

```toml
# wrangler.toml（正确配置）
name = "tanghulu"
compatibility_date = "2024-09-23"
pages_build_output_dir = "./dist"

[[kv_namespaces]]
binding = "TANGHULU_VIEWS"
id = "..."

[[d1_databases]]
binding = "TANGHULU_DB"
database_name = "tanghulu-db"
database_id = "..."
```

---

### 4. `functions/` 目录与 Astro SSR Worker 冲突
**错误**: `/admin` 和其他 SSR 路由返回 404
**原因**: 项目保留了旧的 `functions/api/` 目录（CF Pages Functions），与 Astro 生成的 SSR Worker 产生路由冲突
**解决**: 删除整个 `functions/` 目录，所有路由统一由 Astro 的 `dist/_worker.js` 处理

---

### 5. `Astro.locals.runtime.env` 在 Astro v6 中被移除
**错误**: `Error: Astro.locals.runtime.env has been removed in Astro v6`
**所有页面和 API 路由 500**
**解决**: 改用 `import { env } from 'cloudflare:workers'`

```ts
// ❌ Astro v5 写法（已失效）
const db = Astro.locals.runtime.env.TANGHULU_DB;

// ✅ Astro v6 正确写法
import { env } from 'cloudflare:workers';
const db = env.TANGHULU_DB;
```

在 `src/env.d.ts` 中声明类型：
```ts
declare module 'cloudflare:workers' {
  interface Env {
    TANGHULU_DB: D1Database;
    TANGHULU_VIEWS: KVNamespace;
    ADMIN_PASSWORD: string;
  }
}
```

---

## 环境变量配置（CF Pages Dashboard）

在 **Settings → Environment variables → Production** 中添加：

| 变量名 | 说明 |
|--------|------|
| `ADMIN_PASSWORD` | 后台管理密码，不设置则 admin 无法登录 |

D1 和 KV 绑定通过 `wrangler.toml` 自动配置，不需要在 Dashboard 手动添加。

---

## 本地开发

```bash
# 启动本地 wrangler pages dev（会自动读取 wrangler.toml 中的绑定）
npm run build
npx wrangler pages dev dist

# 首次本地开发需要建表
npx wrangler d1 execute tanghulu-db --local --file=migrations/0001_init.sql
npx wrangler d1 execute tanghulu-db --local --file=migrations/0002_items.sql
```

---

## 内容迁移（Markdown → D1）

```bash
# 从 src/content/items/*.md 生成 SQL
node scripts/migrate-content.mjs

# 推送到远程 D1
npx wrangler d1 execute tanghulu-db --remote --file=migrations/0003_seed.sql
```
