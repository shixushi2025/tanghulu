# 单个 Cloudflare Worker：静态前端、API、图片与 D1

项目使用 **Astro 7 静态输出 + 一个独立 Worker + D1 / KV**。Node.js 22.19+，建议 24 LTS；使用 `npm ci` 安装锁定依赖。没有 Astro 服务端适配器，不生成 Pages 或 SSR 产物。

## 官方方案与路由

Cloudflare [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) 支持在一次部署中发布 Worker 代码与静态资源；默认命中静态资源时不调用 Worker。这里使用 `assets.run_worker_first` 精确指定 API、后台、随机入口和详情深链接。

- `/`、`/category/*`、`/search`、`/about`、CSS、JS、图片：直接提供 Astro 构建的静态文件。
- `/api/*`：唯一 Worker 内的 JSON API，查询 D1、验证管理权限、处理评分和统计。
- `/item/:id`：Worker 检查条目存在后返回静态详情模板；浏览器获取最新正文。未知条目返回真实 404。
- `/admin/*`：Worker 验证登录后返回静态后台模板；API 再独立验证权限。静态页面没有内嵌私有数据。
- `/random`：查询当前 D1 后 302 跳转。

这是静态多页面前端，使用 `404-page`，不把所有未知路径降级成首页。API 导航不会得到 HTML，失效图片和错误链接保持 404。内容需要 JavaScript；搜索引擎及分享抓取器若不执行 JS，只能读取静态模板元信息。当前未实现详情 SEO 预渲染或边缘元信息注入，不能宣称与原 SSR 抓取效果相同。

## main 自动部署：从 Pages 切换到 Workers Builds

最后核实的线上 Git 集成仍是 **Cloudflare Pages**。仓库配置已经改成 Worker，不代表 Cloudflare 控制台已完成迁移。本机 Cloudflare OAuth 过期，尚未确认生产 Worker、远程迁移和域名切换；原站保留，不能把 Git 推送成功当成上线成功。

按照官方 [Pages 迁移到 Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) 文档，需要连接 Workers Builds 并关闭旧 Pages 自动部署。设置如下：

| 项目 | 值 |
| --- | --- |
| Worker 名称 | `tanghulu`（与 `wrangler.toml` 一致） |
| Git 仓库 / 生产分支 | `shixushi2025/tanghulu` / `main` |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |
| Node.js | 24 |
| 静态目录 / 后端入口 | `dist/` / `worker/index.ts`，由 Wrangler 配置管理 |

首次切换顺序：

1. 恢复 Cloudflare 登录，核实账号与已有 D1 / KV ID；按下文先完成 D1 **schema** 阶段。
2. 创建或选择目标 Worker，绑定现有 D1 / KV，设置 Worker 的 `ADMIN_PASSWORD`、`VISITOR_HASH_SECRET`。Pages Secret 不会自动复制到 Worker。
3. 连接仓库 main，按上表配置 Workers Builds。构建身份必须有目标 D1 读取权限；部署身份需要 Worker 发布和绑定资源权限。Worker 运行时 Secret 与构建环境变量分别配置，密钥不能放进 Git 或 `PUBLIC_*`。
4. 在 Worker 预览域名验证页面、API、管理认证和全部图片后，补 D1 **content** 阶段。线上尚未核实，旧只读检查为 55 条、书封字段为空。
5. 验证后将 `tanghulu.life` 从 Pages 切换到该 Worker，并关闭 Pages 自动部署。域名只交给一个生产项目；保留旧部署便于回滚。

`prebuild` 检测到 `CF_PAGES=1` 会明确停止旧 Pages 构建，避免把静态文件发布到没有 API 的项目。旧 Pages 检查失败是迁移保护，不表示已切换。`postbuild` 在 Workers Builds 执行只读 D1 表结构检查：缺表、缺精选字段或无读取权限均阻止发布。普通本地构建和 GitHub 测试不访问生产库。代码发布不自动修改 D1，不重放历史种子。

默认不要启用绑定生产 D1 的分支预览部署。需要预览时使用独立 Worker、D1、KV 配置与独立 Secret，再启用对应分支构建。

## 图片与数据放在哪里

| 内容 | 存放和发布方式 | 更新策略 |
| --- | --- | --- |
| 60 张 Logo、书封、海报等 | Git 中的 `public/images/covers/` → `dist/` → Workers Static Assets | 已压缩 WebP，合计约 845 KiB；哈希文件名，一年 immutable 缓存 |
| 63 条内容、评分、浏览数 | D1；封面字段只存路径 / URL，不存图片二进制 | 后台编辑立即生效；批量补充通过增量 SQL |
| 历史浏览量 | 现有 `TANGHULU_VIEWS` KV namespace | 保留绑定，首次读取旧基线；新计数写 D1 |
| 图片出处、版本与许可 | `docs/image-sources.json`、`src/data/images.json`、公开署名文件 | 随图片一起提交，详情显示来源与必要署名 |
| 管理密码与匿名化密钥 | Worker Secrets；本地 `.dev.vars` | 不进 Git、不进浏览器资源 |

当前规模直接发布静态图片即可，不需要先接 R2 或收费图片处理服务。访问页面时不抓取第三方图片；构建也不联网重新获取图片。`images:sync` 是编辑人员主动运行的离线准备步骤。未确认的三个条目保留占位图。

以后若需要后台上传图片，再增加私有写入的 R2 bucket、受认证的上传接口和公开图片域名；数据库仍只保存 URL。这个上传功能尚未实现，不能把 Worker 临时文件系统当作持久图片库。

## 构建与绑定

```sh
npm ci
npm run verify
npm run deploy:check       # 构建、检查文件隔离、dry-run；不发布、不改 D1
```

Astro 生成 `dist/` 内的 21 个静态页面与资源。Wrangler 单独打包 `worker/index.ts`，后端源文件不进入静态目录；只运行一次 `wrangler deploy`，同时发布资源与 Worker。`check-deploy.mjs` 检查静态文件、图片字节数及源文件隔离。没有生成配置重定向，所有命令使用根目录 `wrangler.toml`，本地 `.wrangler/state` 在构建后保留。

| 绑定 / Secret | 用途 |
| --- | --- |
| TANGHULU_DB | D1 内容、评分、浏览量、限流 |
| TANGHULU_VIEWS | KV 历史浏览数；没有额外 session namespace |
| ASSETS | 自动发布的静态资源目录 |
| ADMIN_PASSWORD | 长随机后台密码，同时用于管理令牌签名 |
| VISITOR_HASH_SECRET | 独立长随机 HMAC 密钥，用于匿名指纹 |

管理认证使用签名 Cookie，不依赖 Astro session。未设置管理密码时后台关闭；匿名指纹密钥缺省时回退到管理密码，生产应独立设置。

`wrangler.toml` 中资源 ID 是实际部署目标。隔离预览请使用另一个配置文件并替换 Worker 名称、D1、KV，切勿将远程预览绑定到生产库。本地 `--local` / `wrangler dev` 默认使用模拟数据库。

首次或重新登录、配置生产 Secret：

```sh
npx wrangler login
npx wrangler whoami
npx wrangler secret put ADMIN_PASSWORD --config wrangler.toml
npx wrangler secret put VISITOR_HASH_SECRET --config wrangler.toml
```

值在交互提示中输入，不写入脚本。已有 Secret 无需重复设置。

## 本地全新安装

```sh
npm ci
npm run db:local
cp .dev.vars.example .dev.vars
# 修改本地密码和密钥
npm run build
npm run dev
# 修改前端后重新构建；也可另外运行 npm run dev:ui 使用热更新
```

`db:local` 只适用于新库或迁移历史完整的本地库。端到端测试会创建、迁移并销毁独立临时库，不读写开发库和生产库。

## 已有生产数据库：分阶段升级

先核对账号、资源 ID、当前部署版本，在隔离库演练，再执行：

```sh
npm run db:status -- --remote
npm run db:upgrade -- --remote --phase schema
# 发布本分支已验证的 Worker 及全部图片（或等待已配置的代码发布完成）
npm run deploy
# 先确认图片 URL 可访问，再补充内容与封面
npm run db:upgrade -- --remote --phase content
npm run db:status -- --remote
```

升级脚本执行前检查表结构，每个实际升级阶段先导出数据库到 `.backups/`，导出失败即停止。备份目录被 Git 忽略，文件权限设为 0600，包含私有数据，需妥善保存。用 `--local` 替换 `--remote` 可演练；可附加 `--config <独立 wrangler.toml>` 指向隔离配置；本地数据库保存在该配置所在目录的 `.wrangler/state`。

脚本只运行明确列出的 `0004_featured.sql`、`0004_security_metrics.sql` 至 `0007_content_images.sql`，用独立的 `tanghulu_release_migrations` 记录文件名及 SHA-256。已记录的迁移不重放；已执行文件被改动时拒绝升级。未来新增迁移需要显式加入脚本和测试，不能修改已发布的 SQL。

- schema：已有 featured 字段只登记迁移，不重跑 ALTER / 初始精选覆盖；缺字段时添加并初始化。添加安全、限流、浏览计数结构；清除孤立评分，将历史原始 IP 标识匿名化，保留有效评分值。原始身份不能通过代码回滚恢复。
- content：补齐原有 55 条、新增 8 条；按旧字段精确匹配保护后台编辑；给标题 / 分类相符的空封面配图，保留自定义封面、评分、浏览量以及已有 `featured` 字段。
- 重复执行安全；迁移记录最后写入，中途中断后可重试这些幂等迁移。执行期间应暂停后台编辑，避免与人工修改竞争。

历史 `0003_seed.sql` 使用 REPLACE，**不要在已有数据库上盲目运行全部 migrations apply**，尤其是旧库曾用 SQL 文件手工初始化、没有 Wrangler 迁移记录的情况。升级脚本不会伪造历史 `d1_migrations`，两套流程不要混用。

## 确认空库后的首次生产初始化

只有确认目标没有需要保留的数据时，才执行完整迁移：

```sh
npx wrangler d1 migrations apply tanghulu-db --config wrangler.toml --remote
npm run deploy
```

内容文件不是生产数据库：只推 Git / 只构建不会自动补线上内容。CI 只验证，不自动修改生产 D1。

## 验收和回滚

发布后检查首页、分类、详情、搜索、后台 CRUD、评分和浏览接口；验证图片 200、`image/webp`、immutable 缓存，管理 Cookie 在 HTTPS 下含 Secure，跨来源写请求 403，未公开服务器文件。D1 内容补充有跳过时，按内容审计文档人工合并，不强制覆盖。

Worker 代码回滚和 D1 数据恢复是两件事。记录发布前的 Worker 版本；需要恢复数据时先核查导出 / D1 Time Travel 的可用恢复点，暂停写入并评估恢复后会丢失的新评分和编辑，不直接将整份导出覆盖到仍在使用的生产库。切回旧 KV 计数实现后需对账。

图片更换先发布新文件，再更新 D1 路径。保留仍被数据库引用的旧哈希文件，至少覆盖回滚窗口；同步脚本不会自动删除它们。若回滚到不含新图片的旧部署，须同步回退对应封面路径或保留资源兼容版本。

503 优先检查绑定、迁移和 Secret；429 表示限流，不应绕过；图片 404 检查当前部署是否包含对应哈希文件。动态响应安全头由 Worker 设置，静态页面安全头与图片缓存由 `public/_headers` 设置。

参考：[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[静态资源响应头](https://developers.cloudflare.com/workers/static-assets/headers/)、[D1 迁移](https://developers.cloudflare.com/d1/reference/migrations/)、[D1 数据恢复](https://developers.cloudflare.com/d1/reference/time-travel/)。
