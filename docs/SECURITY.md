# 安全设计与边界

## 已落实

- 管理路径边界匹配，HMAC-SHA256 令牌有效期 7 天；错误格式、篡改、过期、异常 Cookie 均拒绝。
- Cookie 为 HttpOnly / SameSite=Strict / Path=/；HTTPS 添加 Secure。HTTP 仅为本地开发保留兼容。
- 所有 API 写请求要求 Origin 与请求 URL 同源；跨站 fetch metadata 拒绝。脚本调用也必须携带正确 Origin。
- 登录尝试按服务端 IP 的 HMAC 分桶，D1 原子计数，最多 10 次 / 15 分钟；评分和浏览也限流。
- 不新增原始 IP 到数据库或 KV。历史评分指纹迁移为 legacy 行标识。
- 内容字段验证长度、类型、枚举、真实日历日期；URL 仅 HTTP(S)，不含凭据。
- 参数化 SQL、JSON 安全序列化、搜索 DOM textContent、Markdown 白名单清洗；请求体分块读取并限额。
- CSP 禁止第三方及内联可执行脚本，禁 iframe 嵌入和 object；安全头、敏感路由 noindex、动态响应 no-store。
- `.dev.vars` 忽略提交，打包 server 源目录不随静态目录公开。

密码比较先做 SHA-256 摘要，再遍历固定长度字节；这不是多用户密码数据库方案。ADMIN_PASSWORD 是运行环境 Secret，不能保存在数据库或前端。多人运营时应迁移到具备 MFA、会话撤销和审计能力的身份服务。

## 有意保留的限制

- IP 级匿名身份不是实名用户：共享网络可能共用评分，切换网络／密钥会产生新身份。旧评分去标识后再次投票也可能新增一条。社区数据只作参考，不用于利益分配。
- 固定时间窗边界可出现短时双倍请求；当前限流主要防单来源滥用，不代替 Cloudflare WAF、DDoS 防护或验证码。
- 注销清除当前 Cookie，不撤销已泄露的同一令牌；紧急撤销需轮换 ADMIN_PASSWORD。
- CSP 保留 inline style 以兼容 Astro 和设计变量；外部 HTTPS/HTTP 图片允许显示，客户端仍可能直接请求图片源。
- 浏览记录过期后惰性分批删除，无访问时不会即时物理清除；有严格隐私保留要求时增加定时清理。
- 使用 Cloudflare 提供的 CF-Connecting-IP；不要把相同服务直接部署到允许客户端伪造该头的代理后方。
- 本次检查涵盖源代码、依赖审计和本地回归，不等于生产渗透测试。
- 仅本地开发模式允许 Vite 所需的内联脚本和 WebSocket；生产构建通过 assetsInlineLimit=0 强制独立脚本文件，保持严格 script-src。

## 依赖管理

锁文件更新到兼容安全版本。`@tailwindcss/typography` 固定依赖的旧 selector parser 存在复杂度漏洞，使用同主版本 `postcss-selector-parser ^6.1.5` override（[漏洞及修复版本公告](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)）；保留构建和浏览器测试验证兼容。升级 typography 后检查是否可移除此覆盖。

每次升级运行 `npm audit`、`npm run verify`。禁止无评估使用 `npm audit fix --force` 做破坏性降级。
