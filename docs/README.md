# TTT-I-M — Platform Docs

> 从「电影感个人作品集」演进为「landing + 内容平台」的工程文档。
> **Monorepo（npm workspaces）**：`apps/landing`（React 19 + Vite + GSAP + Three/R3F + Lenis）
> 承载电影感首页；`apps/studio`（Next.js App Router）承载 `/blog`·`/work`·`/dashboard`
> 内容面；`packages/{tokens,content}` 共享设计 token 与内容 schema/repository。

> 文档区分「当前实现」与「已确定、待实现的设计」。现状以代码为准；设计方向不得误写为已上线能力。旧平台升级计划见 [`/plan`](../plan/)。

> **当前交付：温暖档案室与整站预备加载（2026-09-07）。** 原位增加房间软装、收敛材质噪点、烘焙网页材质与间接光，桌面使用开屏预备和共享空间 renderer。查看[本轮制作与检查记录](landing/delivery/warm-archive.md)。视觉由 tim 检验，未提交远程。

2026-09-08 后续修复：[空间初始化与转场叠层](landing/delivery/space-recovery.md)，包含预览尺寸恢复、热更新、投射背景清理与镜头避让；模型资产保持不变。

历史阶段依次为[目录整理](landing/delivery/directory-organization.md)、[近景制作](landing/delivery/transition-closeups.md)、[网页主线](landing/delivery/web-choreography.md)、[电影感模型](landing/delivery/cinematic-model.md)。这些文档的阶段边界不替代当前交付状态。

## 按责任查阅

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
| Landing 当前交付 | [温暖档案室](landing/delivery/warm-archive.md) | 装修来源、活跃工程、网页准备和技术证据 |
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
plan/        下一阶段蓝图：粒子连续体（00–06 + README）；已交付平台架构冻结于 06
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
