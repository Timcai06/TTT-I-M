# Plan · Builder Graph OS

> 当前 `plan/` 不再是 Particle Continuum 的执行清单。那一阶段已经完成：Landing 的电影感、滚动叙事、Continuum、性能守卫和多 zone 内容平台都成为新的地基。
>
> 新阶段的目标是把这个站从「Tim Cai 的作品集」推进为一个产品：帮助任何 builder 连接 GitHub，看见自己做过什么、如何进步、哪些项目构成了自己的能力图谱。

## 一句话

> **Turn your GitHub history into a story of growth.**
>
> 把用户散落在 GitHub 里的 repo、commit、PR、issue、README、CI、部署记录，转化成一张可以理解、可以展示、可以复盘、可以继续成长的 Project Graph。

## 北极星

Builder Graph OS 不是 GitHub Analytics，不是简历生成器，也不是普通 portfolio 模板。

它要做的是：

- 帮用户从杂乱仓库里看见自己的成长路线。
- 把真实工程行为翻译成人类可理解的能力证据。
- 让用户因为自己的提交、修复、重构、文档、部署和实验而获得成就感。
- 让 AI 基于真实代码资产解释「我做了什么」「我怎么变强」「下一步该补什么」。
- 让公开主页成为可信的成长档案，而不是手填标签和包装文案。

## 产品定位

| 不是 | 而是 |
|---|---|
| 只展示 Tim 的个人 GitHub | 任何用户都能绑定 GitHub 生成自己的图谱 |
| 静态项目列表 | 自动生长的 Project Graph |
| 绿色格子统计 | 成长叙事和能力证据 |
| 简历包装器 | 真实代码历史的解释层 |
| 普通 dashboard | 有审美、有情绪、有 AI 复盘能力的 builder cockpit |

## 当前地基

- `apps/landing`：电影感入口，保留 Tim Cai 个人品牌和视觉样板。
- `apps/studio`：Next App Router 内容平台，承接未来用户侧页面、dashboard、公开 graph。
- `packages/content`：端口-适配器内容层，可扩展到数据库 adapter。
- `packages/tokens`：跨应用视觉 token。
- CI / Vercel / Speed Insights / cross-zone smoke：部署与运行守卫已经存在。
- Particle Continuum：视觉系统阶段已完成，作为 flagship demo 保留，不再是 plan 主线。

## 新阶段文件导航

| 文件 | 作用 |
|---|---|
| [`00-principles.md`](./00-principles.md) | 不可违背的产品与工程原则 |
| [`01-north-star.md`](./01-north-star.md) | 终极愿景、目标用户、产品情绪 |
| [`02-system-boundaries.md`](./02-system-boundaries.md) | Landing / Studio / GitHub / DB / AI 的职责边界 |
| [`03-product-pillars.md`](./03-product-pillars.md) | Project Graph、Growth Timeline、Skill Radar、AI Mentor 等产品支柱 |
| [`04-evidence-and-trust.md`](./04-evidence-and-trust.md) | 真实证据、隐私、授权、可解释性原则 |
| [`05-guards-and-budgets.md`](./05-guards-and-budgets.md) | 新阶段守卫、性能、数据、AI 安全预算 |
| [`06-roadmap.md`](./06-roadmap.md) | 阶段方向与已完成历史冻结，不写具体 sprint todo |

## 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 新产品方向 | **Builder Graph OS** | 从个人展示升级为可服务所有 builder 的成长系统 |
| 数据来源 | **GitHub-native first** | repo、commit、PR、README、Actions 是最真实的成长证据 |
| AI 角色 | **解释层，不是事实源** | AI 负责总结、归纳、建议；事实必须能追溯到 GitHub / 用户输入 |
| 用户价值 | **成就感 + 清晰度** | 让用户看见自己做过什么、如何进步、下一步往哪走 |
| 视觉关系 | **Landing 是旗舰 demo，产品能力进 Studio** | 不让产品后台污染电影感入口，也不让视觉系统绑死 SaaS 能力 |
| 路线纪律 | **先方针，后计划** | 当前只定义北极星和边界，不写具体实现任务 |

## 完成声明

Particle Continuum / M0-M4 视觉架构计划可以视为完成并冻结。后续若继续优化它，应作为 Builder Graph OS 的「旗舰样板体验」维护，而不是 plan 主线。
