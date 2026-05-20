# 糖葫芦 🎏

精选那些值得你时间的东西——电影、书籍、AI 工具、播客、健康好物等的个人推荐站。

基于 **Astro v6 (SSR)** 构建，部署在 **Cloudflare Pages**，数据存于 **Cloudflare D1**，浏览量计数用 **Cloudflare KV**。

## ✨ 功能

- **首页 / 分类页**：按分类浏览精选条目，卡片展示封面、摘要、标签
- **详情页**：Markdown 正文、浏览量统计、社区星级评分、同类推荐
- **搜索**：基于 [Fuse.js](https://fusejs.io/) 的客户端模糊搜索（标题 / 摘要 / 标签 / 地区）
- **后台管理**：密码登录（HMAC 签名 Cookie），条目的增删改
- **SEO**：Open Graph / Twitter 卡片、`sitemap.xml`、`robots.txt`、`rss.xml`

## 🚀 本地开发

```sh
npm install
npm run dev        # 启动 astro dev，http://localhost:4321
```

涉及 D1 / KV 绑定的页面需要 wrangler 本地环境：

```sh
npm run build
npx wrangler pages dev dist

# 首次需建表
npx wrangler d1 execute tanghulu-db --local --file=migrations/0001_init.sql
npx wrangler d1 execute tanghulu-db --local --file=migrations/0002_items.sql
```

## 📦 常用命令

| 命令               | 说明                                   |
| :----------------- | :------------------------------------- |
| `npm run dev`      | 启动本地开发服务器                     |
| `npm run build`    | 构建生产产物到 `./dist/`（含部署修正） |
| `npm run preview`  | 本地预览构建产物                       |

## 📁 项目结构

```text
src/
├── components/   # ItemCard 等组件
├── content/      # Markdown 内容（可迁移到 D1）
├── layouts/      # BaseLayout（含 SEO 元信息）
├── lib/          # db（D1 查询）、auth（鉴权）、categories（分类配置）
├── pages/
│   ├── index.astro          # 首页
│   ├── category/[category]  # 分类页
│   ├── item/[slug]          # 详情页
│   ├── search.astro         # 搜索
│   ├── about.astro          # 关于
│   ├── admin/               # 后台管理
│   ├── api/                 # 评分 / 浏览量 / 后台 API
│   ├── sitemap.xml.ts       # 站点地图
│   ├── robots.txt.ts        # robots
│   └── rss.xml.ts           # RSS 订阅
└── middleware.ts # 后台鉴权
```

## 🔧 部署与环境变量

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。后台登录需在 Cloudflare Pages 设置 `ADMIN_PASSWORD` 环境变量；D1 与 KV 绑定见 `wrangler.toml`。
