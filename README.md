# 糖葫芦

个人精选站：[tanghulu.life](https://tanghulu.life) — 「精选那些值得你时间的东西」。

- **Frontend**: Astro static + 客户端请求 API（Cloudflare Pages）
- **Backend**: 独立 Cloudflare Worker（D1 条目、KV 浏览次数、admin 鉴权、评分、sitemap）

部署细节见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 本地

```bash
npm install
npm run db:migrate:local
npm run dev:api   # 另一个终端
npm run dev
```

后台：`/admin`（Worker secret `ADMIN_PASSWORD`）。

## 内容

条目 seed 在 `src/content/items/*.md`，运行时以 D1 为准。首页「精选」读取 `featured` 列（迁移 `migrations/0004_featured.sql`）；未迁移时 Worker 会用内置 ID 兜底。
