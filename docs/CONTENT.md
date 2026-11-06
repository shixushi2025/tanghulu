# 内容维护

## 本轮补充

本轮将内容库从 55 条补充至 63 条，原有 55 条更新摘要、正文或元数据，新增 Obsidian、Zotero、Blender、Excalidraw、Godot、LocalSend、Visual Studio Code、freeCodeCamp。工具内容补齐场景、步骤、任务示例、限制与来源；其他分类补充阅读和实践建议。

源文件在 `src/content/items/`，增量迁移为 `0005_editorial_content.sql` 和 `0006_content_refresh.sql`。详情见 [内容整理记录](CONTENT-AUDIT.md)，核验状态见 [来源清单](content-sources.json)。仍有 3 条缺可靠入口，明确保留待核实说明；未增加虚构用户评价、使用经历或实时价格。

运行 `npm run content:check` 可核对 Markdown 与全新数据库是否一致，并检查已有编辑、评分及浏览量是否在升级中保留。用户指定的额外素材尚未收到。

## 内容源与发布

运行时以 **D1 为准**，Markdown 为版本化编辑素材。只修改 Markdown 不会自动更新线上数据库。

- 少量更新：登录 `/admin` 编辑，保存后页面立即读取新内容。
- 新条目批量加入：添加 Markdown，运行 `npm run check` 校验 frontmatter，并更新来源清单及增量迁移，执行 `npm run content:check`，再运行 `npm run content:sql` 生成 `content-seed.sql`，审阅后在目标环境手工导入。
- 导入脚本只新增缺失 ID，使用 ON CONFLICT DO NOTHING，保留后台编辑；不会覆写历史迁移文件。
- 更新已有内容：创建新的编号迁移，对全部待修改字段进行旧值比较（参见 `0006`），或后台人工编辑。
- 历史 `0003_seed.sql` 仅用于全新数据库，禁止在已有内容的数据库重放。

## 编辑模板

```yaml
---
title: "条目标题"
category: book
tags: [阅读, 思考]
rating: 4
summary: "一句话说明它是什么，以及为什么值得关注。"
cover: ""
date: 2026-11-06
link: ""
mood: [独处, 学习]
country: ""
---
```

正文建议：`## 为什么值得了解`、`## 适合谁`、`## 怎样开始`、`## 使用前需要了解`。书影音尽量不剧透；工具写清实际适用任务和局限；涉及版本、价格、可用地区、医疗／法律信息时查阅官方来源并记录核验日期。

Frontmatter 中的 rating 是历史编辑数据，D1 不导入它；页面社区分数完全来自读者实际提交，不把编辑分数伪装成社区评分。本轮已为 60 条内容配图，保留来源及版本信息。具体获取渠道、许可记录和新增流程见 [图片维护](IMAGES.md)。尚缺图片时使用品牌占位图。

## 字段边界

标题 160 字、摘要 600 字、正文 50000 字；标签／场景各 20 个、每个 40 字；URL 2048 字且只接受 HTTP(S)，封面另允许 `/images/covers/` 下的 WebP 站内路径；ID 为 1–100 位字母、数字、连字符或下划线；日期是真实 YYYY-MM-DD。
