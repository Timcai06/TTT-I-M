# TTT-I-M · 文档入口

> **当前阶段（2026-09-09）：桌面 Personal Archive 体验精修。** 从 [PM 工作入口](pm/README.md) 开始；产品方向看 [产品简报](pm/product-brief.md)，授权任务与进度看 [执行看板](pm/board.md)，协作方式看 [流程](pm/workflow.md)。

本页下方保留架构与历史专项索引，便于追溯。它们不是并行生效的多套“当前方向”。`experience` 是设计资料，`assets` 是资产资料，`delivery` 是历史交付证据；实际能力须结合当前代码和运行验证。`plan/` 属于 Builder Graph OS 独立路线，不自动加入本阶段。

最近一次进入本阶段前的执行修订见 [自然光房间规范](landing/experience/natural-room-production.md) 顶部，历史报告见 [实现记录](landing/delivery/natural-room-implementation.md)。用户决定已汇入产品简报；旧文中的执行人、时长、精确参数和完成结论不可直接继承为本阶段约束或验收。

## 架构与历史专项索引

| 层次 | 入口 | 责任 |
| --- | --- | --- |
| 系统现状 | 下方 01–05 | 架构、视觉基础、性能、文件结构、检查；保留已有链接 |
| Landing 体验设计 | [空间与滚动叙事](landing/experience/spatial-narrative.md) | 已确认方向、章节节奏、交互边界 |
| Landing 全站效果 | [整站空间编排](landing/experience/full-site-choreography.md) | 全章节方向；已实现主线与取舍见[网页交付](landing/delivery/web-choreography.md) |
| Landing 交互规格 | [分镜与状态交接](landing/experience/interaction-contracts.md) | 默认进度、源图对应、详情历史、加载和失败处理；设计 v1 |
| Landing 首段实现 | [桌面空间过渡](landing/experience/desktop-archive-entry.md) | Hero → 空间 → About 的滚动编排与模块职责 |
| Landing 设计参考 | [Unseen Studio](landing/experience/unseen-reference.md) | 首要学习对象、来源事实、转化提案与待研究问题 |
| Landing 资产制作 | [个人空间制作规范](landing/assets/personal-space.md) | 模型、材质、灯光、导出及版本 |
| Landing 章节建模 | [章节建模任务](landing/assets/chapter-modeling-plan.md) | 照片墙、屏幕、抽屉的局部制作与导出契约 |
| Landing 交付记录 | [空间阶段记录](landing/delivery/personal-space.md) | 实际完成情况与待验收项 |
| Landing 历史交付 | [温暖档案室](landing/delivery/warm-archive.md) | 装修来源、活跃工程、网页准备和技术证据 |
| Studio 历史专项 | `superpowers/specs`、`superpowers/plans` | 保持既有目录，本次空间任务不涉及 Studio |

新增专项按「功能 / experience、assets、delivery」归档。现有系统文档不批量搬迁，避免破坏引用；专项文档要标明状态，并由交付记录区分计划和实现。

---

## 📖 文档中枢 (Map of Content)

- [01 · 核心架构与页面流](./01-architecture.md) — chapter registry、运行时 SSOT（`lib/stage.ts`）、
  内容层、monorepo/平台分层、跨 zone 路由。
- [02 · 视觉系统与艺术指导](./02-visual-system.md) — 暗房/工程图纸气质、配色、排版层次。
- [03 · 性能策略与资源治理](./03-performance-and-assets.md) — 分层预热、WebGL 质量分级、
  滚动单源、grain 降级、chunk 体积预算。
- [04 · 文件结构与目录治理](./04-file-structure.md) — monorepo 布局与各目录职责。
- [05 · 测试、守卫与 CI](./05-tests-and-guards.md) — build guards、platform guard、守卫覆盖盲区。

> 历史上曾有 `docs/01-architecture/`、`docs/02-components/*` 等子目录，已在平台化重构中
> 合并为上面这套扁平文档；旧的 `file://` 深链已失效，以本页为准。

---

## 🗺️ 仓库形态速览

```
apps/
  landing/   @timcai/landing — Vite 电影感首页（chapter registry + 运行时 SSOT + WebGL）
  studio/    @timcai/studio  — Next App Router 内容面（/blog /work /dashboard, RSS, sitemap, OG）
packages/
  tokens/    @timcai/tokens  — 共享设计 token（CSS 变量）
  content/   @timcai/content — 内容 schema + repository 接口 + adapters
plan/        Builder Graph OS 独立路线；本阶段不自动执行
tests/build/ platform-guards.mjs（跨 workspace 守卫）
```

---

## 🎯 面向未来的开发指南
1. **新增章节（landing）**：只改 `apps/landing/src/chapters/registry.ts`，导航/进度轨/锚点自动处理。
2. **新增动效**：React 内的 GSAP 动画使用有 scope 的 `useGSAP()`；HTML-in-Canvas 效果复用 `CanvasUiHtmlSurface`，避免生命周期和 context 预算分叉。
3. **高渲染开销组件**：复用 `lib/webgl/useGLSurface`（IntersectionObserver mount/pause）+
   `lib/webgl/quality` 设备分级，离屏即掐断。
4. **内容（studio）**：组件只认 `@timcai/content` 的 repository 接口，绝不直连数据文件；
   studio 运行时**禁止** import GSAP/R3F/Three/Lenis（platform guard 强制）。
5. **新增博文**：在 `apps/studio/content/posts/*.mdx` 写 frontmatter + 正文即可。
