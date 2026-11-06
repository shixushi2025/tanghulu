# 系统设计

## 数据流与职责

浏览器 → Cloudflare Static Assets（图片、CSS、JS）或 Worker → Astro SSR 路由 → middleware → lib 服务 → Cloudflare D1 / KV。

- `middleware.ts`：同源写入检查、管理访问控制、统一错误与安全头。
- `lib/http.ts`：流式请求体限额（拒绝伪造／缺失长度头的大包）、JSON 解析和 HTTP 错误。
- `lib/validation.ts`：创建／更新共用的类型、长度、日期、类别及 URL 验证。
- `lib/auth.ts`：HMAC-SHA256 管理令牌、过期验证、Cookie 与密码摘要比较。
- `lib/security.ts`：按用途隔离的 HMAC 匿名指纹、D1 原子限流。
- `lib/db.ts`：所有 SQL 参数化；列表投影与详情正文读取分离；共享分页和相关推荐查询。
- `scripts/item-form.ts`：共用编辑交互，处理加载、错误、重试、未保存离开提示。
- `lib/dom.ts`：类型安全的 DOM 获取，以及存储被禁用时的降级处理。

页面不使用前端应用框架水合。菜单、搜索、评分和后台表单仅加载自身的小脚本；布局、分类与分页为服务端 HTML，关闭 JavaScript 仍可浏览。

## 数据模型

| 表 | 关键约束 | 用途 |
| --- | --- | --- |
| items | id 主键；category/date 复合索引 | 内容与 Markdown 正文 |
| ratings | UNIQUE(item_id, fingerprint)；score 1–5 | 每匿名身份一个评分，可覆盖 |
| view_totals | item_id 主键、外键级联删除 | 浏览总数，首次读取旧 KV 基线 |
| view_events | PRIMARY KEY(item_id, fingerprint, bucket) | 整点小时去重；插入触发器递增总数 |
| rate_limits | key 主键；expires_at 索引 | 原子计数限流，过期记录分批清理 |

浏览写入使用 D1 batch 事务：建立计数行 → INSERT OR IGNORE 去重事件 → 清理过期事件。只有真正插入的事件触发 +1，避免 KV 读改写竞争。每次最多清理 100 条过期记录，正常请求持续推进清理；无流量时旧匿名记录不会立即删除，可配置额外维护任务满足更严格的保留期。

删除条目时，外键清理浏览数据，触发器清理评分；历史 KV 键也删除。旧评分去掉原始 IP 后用不可关联的 legacy 行标识保留统计，原访客再次评分可能增加一条新记录。

## API

| 路径 | 方法 | 验证与行为 |
| --- | --- | --- |
| /api/admin/login | POST | 同源 JSON，2KB，10 次 / 15 分钟 |
| /api/admin/logout | POST | 同源、已登录，清除 Cookie |
| /api/admin/items | POST | 已登录，200KB 上限，共用内容校验，冲突 409 |
| /api/admin/items/:id | PUT / DELETE | 已登录，存在性检查，缺失 404 |
| /api/ratings/:id | GET / POST | 已有条目；POST 为 1–5 整数，60 次 / 15 分钟 |
| /api/views/:id | GET / POST | 已有条目；POST 去重，120 次 / 15 分钟 |
| /random | GET | 从当前条目中随机选择并 302 跳转 |

错误状态：400 参数，401 未认证，403 来源，404 不存在，409 冲突，413 体积，415 类型，429 限流，503 服务不可用。JSON 错误统一 `{ "error": "可读提示" }`。

## 性能选择

首页只读取 12 条列表、3 条精选和分类计数；分类页同样分页。列表 SELECT 不包含 body；相关推荐在数据库内 LIMIT 3。列表排序附带 id，日期相同仍有稳定顺序。搜索页面载入全部元数据而非完整正文，150ms 防抖、最多 40 个渲染结果，使用 DocumentFragment，避免 HTML 字符串拼接。

静态 `_astro` 资源不可变缓存。SSR/API 使用 no-store，保证后台更新和访问控制不被共享缓存污染。没有上线未经失效设计的全局内容缓存；未来条目量较大时应改为 D1 FTS / 服务端搜索、游标分页，并基于实测流量加缓存失效。

当前搜索和管理列表仍按全量元数据处理，适合本仓库的小型精选站；不宣称万级内容或全球高并发 SLA。随机查询 ORDER BY RANDOM() 也适合小集合。

## 发布与内容一致性

使用 Astro Cloudflare 适配器原生生成的 Worker 配置，服务端模块与公开 assets 目录隔离。内容仍以 D1 为准；图片以带哈希文件名的 WebP 随代码发布。已有数据库采用备份后分阶段升级：先安全表结构、再发布 Worker 和资源、最后更新内容与封面路径。升级脚本只处理审核过的增量迁移，不重放历史 REPLACE 种子。远端 main 的 CSR 架构尚未合并进本分支，边界与发布步骤见 DEPLOYMENT.md。
