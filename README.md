# 糖葫芦

一份持续生长的私人精选。把值得看的、读的、用的，串在一起。

Astro 7 静态前端 + Tailwind CSS 4 + 单个 Cloudflare Worker（Static Assets + API）/ D1 / KV。保留暖白与朱红的杂志式设计，支持桌面与手机浏览。

内容库包含 63 条记录，覆盖书影音、工具、健康、创作者等类别；本轮补全内容、来源与使用建议，详情见 [内容整理记录](docs/CONTENT-AUDIT.md)。

图片已为 60 条内容配齐，全部使用站内 WebP；Cloudflare 发布方式、已有数据库升级顺序及 main 自动发布前的数据库检查见 [部署说明](DEPLOYMENT.md)。

## 功能

- 后台可选首页精选、编辑专题、分类筛选、排序与每页 12 条分页，URL 可分享
- 分类页、详情阅读目录、阅读时间、相关推荐、随机发现
- 本地 Fuse 搜索：标题、摘要、标签、场景、类别和地区；150ms 输入防抖
- 社区评分、按访客与整点小时去重的原子浏览统计
- 管理后台登录、搜索、创建、编辑、删除、未保存提示
- 同源写请求校验、安全响应头、登录限流、Markdown 清洗与输入校验
- 认证、输入、数据迁移、并发接口和浏览器流程测试

## 开发

需要 Node.js **22.19+，推荐 24 LTS**。

```sh
npm ci
npm run db:local         # 首次创建全新本地库；已有手工初始化的库请先看部署说明
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置仅用于本地的密码和指纹密钥
npm run build
npm run dev              # Wrangler 本地完整应用，默认 http://localhost:8787
```

运行打包后的 Worker 环境：

```sh
npm run build
npm run preview
```

本地密钥文件不会被 Git 跟踪。`dist/` 只包含静态前端，`worker/index.ts` 独立作为唯一后端入口；两者由根目录 `wrangler.toml` 一次发布。后台地址为 `/admin`。修改前端后重新构建；只调页面时可同时运行 `npm run dev:ui` 使用 Astro 热更新，API 代理到 8787。

内容从 D1 API 实时加载，需要 JavaScript。后台修改无需重建，构建不嵌入容易过期的内容副本。main 已连接 Workers Builds，旧 Pages 自动构建已关闭，配置与生产验收记录见部署说明。

## 验证

```sh
npm run check
npm test
npm run content:check
npm run images:check
npm run test:release
npm run build
npx playwright install chromium   # 首次运行浏览器测试
npm run test:e2e
npm audit
```

`npm run verify` 串行执行类型、单元、内容与图片一致性、D1 分阶段升级、构建与文件隔离、浏览器测试。浏览器测试启动隔离的临时 D1 / KV，自动清理，仅使用测试专用密码，不连接生产环境。

## 内容和系统文档

- [系统设计](docs/ARCHITECTURE.md)：分层、数据模型、API、性能取舍
- [安全说明](docs/SECURITY.md)：认证、输入、限流、隐私与限制
- [测试用例](docs/TESTING.md)：自动与人工验收矩阵
- [图片获取与维护](docs/IMAGES.md)：Logo、书封、海报、来源与同步流程
- [内容维护](docs/CONTENT.md)：新条目、增量导入与编辑规范
- [部署说明](DEPLOYMENT.md)：环境配置、迁移、备份与回滚
- [本轮范围](specs/project-refresh/requirements.md)、[页面设计](specs/project-refresh/design.md)
