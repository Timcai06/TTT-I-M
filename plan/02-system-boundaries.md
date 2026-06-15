# 02 · 系统边界

> 本文只定义职责边界，不定义具体实现任务。

## Landing

Landing 是情绪入口和旗舰样板。它展示 Tim Cai 的个人品牌、视觉能力和 Builder Graph OS 的最终质感。Landing 不承载复杂登录、数据同步、图谱编辑和 AI 对话。

原则：电影感保留，产品能力不要污染首屏叙事。

## Studio

Studio 是产品主入口。未来的 `/graph`、`/dashboard`、`/u/:username`、`/settings`、`/connect` 都应该从 Studio 生长，而不是塞回 landing。

Studio 的职责：

- 用户登录与 GitHub 绑定。
- 私密 dashboard。
- 公开 profile / graph 页面。
- 内容阅读、案例展示、产品说明。
- AI Mentor 和 Project Graph 的交互界面。

## GitHub Connector

GitHub Connector 是事实采集层，不做产品判断。它只负责可靠、安全、可重试地同步：

- 用户 profile。
- repositories。
- languages / topics。
- commits。
- pull requests。
- issues / reviews（授权允许时）。
- workflow runs / CI 状态。
- README / docs / releases。

它不决定用户能力，只产出 evidence。

## Graph Engine

Graph Engine 把 GitHub 原始 evidence 转化为稳定实体关系。

核心实体：

- `User`
- `Repo`
- `Project`
- `Contribution`
- `SkillSignal`
- `Milestone`
- `Evidence`
- `Narrative`

Graph Engine 的职责是归并、连接、去重、打标签、建立时间线。它不能直接生成夸张结论。

## Narrative Engine

Narrative Engine 把图谱转化为用户能理解的语言：项目摘要、成长阶段、技能解释、周报、公开主页文案。

Narrative Engine 必须保留证据引用，并允许用户编辑。AI 输出默认是 draft，不是事实。

## AI Mentor

AI Mentor 是解释和建议层。它可以回答：

- 我这段时间做了什么？
- 哪些项目最能体现后端能力？
- 哪些 repo 值得整理成作品？
- 我的成长路线有什么变化？
- 下一步该补什么？

AI Mentor 不应该替用户做价值审判，也不应该暴露未授权信息。

## Database

数据库是用户记忆层。它保存同步快照、用户修订、公开设置、AI 草稿、图谱结构、生成历史和删除状态。

数据库不是 GitHub 的替代品。GitHub 仍然是外部事实源；数据库保存产品化后的解释和用户选择。

## Public Profile

公开页是用户主动发布的成果。公开页只展示用户选择公开的 repo、项目、图谱、叙事和证据摘要。

公开页的目标不是炫耀数据，而是让他人快速理解这个 builder 的成长路线和能力证据。
