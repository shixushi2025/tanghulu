-- Fill only the unchanged placeholder; preserve manual edits, featured selection and interaction data.
UPDATE items SET
  summary='由女性媒体人发起的泛文化播客，从书影音、社会议题和日常经验出发，适合带着具体问题慢慢听。',
  cover='/images/covers/podcast-stochastic-d305745317c7.webp',
  link='https://www.xiaoyuzhoufm.com/podcast/5e7cc741418a84a046b0c2bd',
  body='## 这是什么节目

随机波动 Stochastic Volatility 是由三位女性媒体人发起的泛文化播客。节目主页与单集说明提供主持人、嘉宾、讨论提纲和延伸阅读，可以先选自己关心的主题，再决定从哪里开始。

## 从一集具体的对话开始

[第 181 期：李颖迪谈家庭书写](https://www.xiaoyuzhoufm.com/episode/6af3e97ce3f66b332520c2d7) 由冷建国与作家李颖迪对谈，围绕《空地》展开。节目提纲涉及家庭记忆、记者经验与写作方式，以及自传体小说和回忆录的区别。

## 怎么听更有收获

以下是编辑建议：先浏览单集时间轴，挑一个真正想了解的问题。听到有兴趣的书或观点时，记下名称与时间点，再回到节目说明查找资料；不必一次听完，也不用把嘉宾观点直接当成结论。

## 适合什么场景

适合有一段相对完整的通勤、散步或独处时间，也适合围绕阅读主题寻找新的讨论角度。各集主题不同，先看内容说明，比只凭节目名称选择更有效。

## 来源与收听入口

- [节目官方发布页（小宇宙）](https://www.xiaoyuzhoufm.com/podcast/5e7cc741418a84a046b0c2bd)
- [第 181 期单集说明与音频](https://www.xiaoyuzhoufm.com/episode/6af3e97ce3f66b332520c2d7)

本条的节目事实依据以上发布页；收听方法为编辑建议，不代表已经试听所有单集。',
  updated_at=unixepoch()
WHERE id='podcast-stochastic' AND
  COALESCE(title,'')='随机波动' AND
  COALESCE(category,'')='podcast' AND
  COALESCE(tags,'')='["女性","文化","社会","中文"]' AND
  COALESCE(summary,'')='待核实条目：需要补充「随机波动」的官方入口与具体单集资料，暂不作节目细节推荐。' AND
  COALESCE(cover,'')='' AND
  COALESCE(date,'')='2026-03-15' AND
  COALESCE(link,'')='' AND
  COALESCE(mood,'')='["通勤","深夜","思考"]' AND
  COALESCE(country,'')='' AND
  COALESCE(body,'')='## 条目状态：待核实

现有资料只保留了「随机波动」这一节目名称，尚不足以确认本条对应的官方主页及具体单集。本次不补写未经核实的主持人信息、更新频率或单集推荐。

## 补全时需要哪些资料

- 可确认身份的节目官方页面或官方发布渠道。
- 希望推荐的单集标题、发布日期和链接。
- 推荐理由，以及适合哪些听众的具体说明。

## 如何完成整理

确认来源后，围绕一集真实节目写清讨论主题、收听前需要的背景，以及听完可以继续阅读的资料。事实介绍与编辑感受分开记录。

本条保留原有链接路径，便于后续补全；目前不应据此判断节目的内容或质量。';
