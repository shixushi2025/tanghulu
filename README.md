# 糖葫芦

个人精选站：[tanghulu.life](https://tanghulu.life) — 「精选那些值得你时间的东西」。

单一 Cloudflare Worker：Astro 静态/CSR 前端（Workers Static Assets）+ `/api`（D1、KV、admin、评分、sitemap）。没有 Pages。

部署见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 本地

```bash
npm install
npm run db:migrate:local
npm run dev:api   # 另一个终端
npm run dev
```

或一次跑通生产形态：`npm run preview`（http://localhost:8787）。

后台：`/admin`（`wrangler secret put ADMIN_PASSWORD`）。

## 内容

条目 seed 在 `src/content/items/*.md`，运行时以 D1 为准。首页「精选」读 `featured` 列（`migrations/0004_featured.sql`）；未迁移时 Worker 用内置 ID 兜底。
