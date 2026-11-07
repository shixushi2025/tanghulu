# Cloudflare Pages / Worker 部署、图片与 D1

项目使用 **Astro 7 SSR + Cloudflare D1 / KV**，生成 Pages 和原生 Worker 两种产物。现有 Git 自动部署目标是 Cloudflare Pages。Node.js 22.19+，建议 24 LTS；用 `npm ci` 安装锁定依赖。

## main 自动部署

当前实现将本轮页面、内容和图片与远端 main 的 Logo、后台精选、公开 API、站点地图合并。统一使用 Astro SSR Worker + Static Assets，保留无 JavaScript 浏览能力；旧 CSR 壳和单独 Hono 入口由相同路径的 SSR / API 替代，D1 / KV 绑定保持原目标。

GitHub 检查确认现有集成是 **Cloudflare Pages**。生产分支 `main`，Node.js 24，构建命令 `npm run build`；根目录 `wrangler.toml` 指定发布目录 `dist/pages`、兼容日期和 D1 / KV 绑定。Pages 自动发布此目录，无需添加 Worker deploy 命令。

原生 Worker 配置保留在 `wrangler.worker.toml`，供 Astro 适配器构建使用。确实切换到 Workers 时使用 `npm run deploy:worker`，或将 Workers Builds 部署命令设为 `npx wrangler deploy --config dist/server/wrangler.json`。两份配置的 D1 / KV ID 应保持一致；同一个自定义域应只交给实际使用的发布项目。

`postbuild` 在 `CF_PAGES` / `WORKERS_CI` 环境下执行只读 D1 检查：必须存在内容、评分、安全限流、浏览计数表以及精选字段。缺少表结构或数据库读取权限时构建失败，现有部署继续运行。Pages 构建需要在环境中配置能够读取目标 D1 的 `CLOUDFLARE_API_TOKEN`，不要提交 token。本地构建与普通 GitHub 测试不访问远程库。手动部署命令同样执行检查。

首次升级需要先完成下方 schema 阶段，再让 main 自动部署成功，最后补内容和封面。推送代码不会重放历史种子，也不会自动覆盖线上编辑。当前线上只读检查仍为 55 条，封面尚未补入；本机 Cloudflare 登录过期且浏览器代理阻断授权，尚未核实或修改远程数据库。不要把 Git 推送成功当作 Cloudflare 发布成功。

## 图片与数据放在哪里

| 内容 | 存放和发布方式 | 更新策略 |
| --- | --- | --- |
| 60 张 Logo、书封、海报等 | Git 中的 `public/images/covers/` → `dist/client/` → Workers Static Assets | 已压缩 WebP，合计约 845 KiB；哈希文件名，一年 immutable 缓存 |
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

适配器生成 `dist/server/entry.mjs`、`dist/server/wrangler.json` 和 `dist/client/`。`scripts/prepare-pages.mjs` 另外生成独立的 `dist/pages/`：只复制公开资源、打包 `_worker.js` 并设置静态图片排除路由。Pages 只上传 `dist/pages`，不能上传整个 dist。服务端源目录不会被复制到 Pages。构建只清理自动部署重定向，保留本地 `.wrangler/state` 数据；原生 Worker 命令明确指定生成配置。

| 绑定 / Secret | 用途 |
| --- | --- |
| TANGHULU_DB | D1 内容、评分、浏览量、限流 |
| TANGHULU_VIEWS | KV 历史浏览数；适配器复用此绑定避免创建多余的 SESSION namespace |
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
npm run dev
# 或：npm run build && npm run preview
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

503 优先检查绑定、迁移和 Secret；429 表示限流，不应绕过；图片 404 检查当前部署是否包含对应哈希文件。响应安全头由 SSR middleware 设置，静态图片缓存由 `public/_headers` 设置。

参考：[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[静态资源响应头](https://developers.cloudflare.com/workers/static-assets/headers/)、[D1 迁移](https://developers.cloudflare.com/d1/reference/migrations/)、[D1 数据恢复](https://developers.cloudflare.com/d1/reference/time-travel/)。
