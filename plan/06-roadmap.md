# 06 · 路线图与历史冻结

> 本文件不写具体 sprint todo，只记录阶段方向和已经完成的历史事实。

## 新阶段方向

### Phase A · Foundation of Trust

建立用户、GitHub 授权、repo evidence、可见性和数据模型边界。目标不是马上做酷炫图谱，而是先保证用户数据可信、可控、可删除、可追溯。

### Phase B · Personal Project Graph

把 repo、project、language、topic、commit、PR、README 和 deployment 连接成用户自己的 Project Graph。先做 high-level graph，再做深层证据展开。

### Phase C · Growth Narrative

把图谱转化为成长时间线、技能信号、贡献摘要和项目故事。AI 开始参与，但所有输出保持 draft / evidence-backed / user-editable。

### Phase D · Public Growth Profile

允许用户发布自己的公开 profile。公开页展示精选项目、成长图谱、技能证据和用户确认后的叙事。隐私过滤和证据链优先于视觉炫技。

### Phase E · AI Mentor

让用户可以围绕自己的 GitHub 历史提问、复盘和规划。AI Mentor 帮用户理解自己已经会什么、下一步该打磨什么、哪些项目最值得展示。

### Phase F · Builder Community Surface

在用户自愿公开的前提下，形成更大的 builder graph：项目主题、学习路线、技术栈迁移、同类项目参考、成长路径对比。但任何比较都必须避免羞辱式排名。

## 已完成历史冻结

### Platform Split

`apps/landing` + `apps/studio` + `packages/content` + `packages/tokens` 的多 workspace 架构已经落地。Landing 保持视觉入口，Studio 承接内容和未来产品能力。

### Content Layer

内容 repository / schema / adapter 的端口-适配器方向已经落地。未来数据库 adapter 应复用这个边界，而不是让 UI 直接依赖存储细节。

### Cross-zone Deployment

`/blog`、`/work`、`/_next` rewrite、cross-zone smoke、Vercel production 部署已经经过验证。后续产品页应沿用同域连续体验。

### Runtime and Performance Discipline

Loader、资源预热、decode queue、WebGL context registry、stage machine、performance e2e、Speed Insights 已经形成基本闭环。新阶段不能回退。

### Particle Continuum

Particle Continuum M0-M4 已完成主体目标：App 级 Continuum、滚动叙事单源、双目标 morph、Work 数学曲面、Contact 水面、GPU/context/performance 守卫。

后续视觉优化可以继续，但它不再是 plan 主线。

## 当前战略判断

项目已经越过「个人展示站」阶段。下一步的真正价值，不是再堆更多前端效果，而是把真实工程资产转化为可复盘、可解释、可公开的成长系统。

> 让每个用户都能从自己的 GitHub 里看见一条成长路线。
