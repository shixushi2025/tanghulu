# 设计

首页为 Editorial / magazine 风格，场景为发现与浏览；详情为 Read，后台为 Operate。沿用 src/styles/global.css 品牌 tokens：paper #f6f0e6、red #c63d34、ink #29231f、muted #746a62、line #ddd1c3。保留现有分类色作为品牌语义例外。标题 Noto Serif SC / Songti SC，正文 Noto Sans SC / PingFang SC；不加载远程字体。

容器 1180px；复用 640 / 820 / 1080 三个断点；4px 间距基准。首页非对称首屏和三列精选，列表以 URL 参数支持分类、排序、分页，每页 12 条。新增三张编辑专题入口。详情正文保持约 70ch；静态页面保留导航，正文与目录由 API 加载。后台沿用固定操作位置，增强标签、错误反馈与删除确认。

HTTP 边界负责 Origin 与安全头；lib/http 负责大小限制与统一错误；lib/validation 统一内容结构；lib/auth 负责 HMAC 令牌；lib/security 负责匿名指纹和原子限流；lib/db 负责参数化查询。D1 保存内容、评分、浏览总数和有期限的去重记录。旧 KV 浏览数只作为 D1 首次初始化基线，保留历史。

静态前端与单个 API Worker 一次发布。API 默认不缓存以保证后台发布立即可见，哈希静态资源使用不可变缓存；内容需要 JavaScript。列表投影不含正文，推荐查询限制 3 条。匿名指纹使用服务端密钥 HMAC。Cookie 为 HttpOnly、SameSite=Strict，HTTPS 时 Secure。
