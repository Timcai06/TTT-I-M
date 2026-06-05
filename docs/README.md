# TTT-I-M — Platform Docs

> 从「电影感个人作品集」演进为「landing + 内容平台」的工程文档。
> **Monorepo（npm workspaces）**：`apps/landing`（React 19 + Vite + GSAP + Three/R3F + Lenis）
> 承载电影感首页；`apps/studio`（Next.js App Router）承载 `/blog`·`/work`·`/dashboard`
> 内容面；`packages/{tokens,content}` 共享设计 token 与内容 schema/repository。

> 原则：**代码即真理**。本目录 100% 映射当前源码；升级蓝图与分期计划见 [`/plan`](../plan/)。

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
plan/        升级蓝图与分期路线（00–06 + README）
tests/build/ platform-guards.mjs（跨 workspace 守卫）
```

---

## 🎯 面向未来的开发指南
1. **新增章节（landing）**：只改 `apps/landing/src/chapters/registry.ts`，导航/进度轨/锚点自动处理。
2. **新增动效**：懒加载 DOM 的滚动特效务必用 `onChaptersReady` + `gsap.context()`，避免生命周期泄漏。
3. **高渲染开销组件**：复用 `lib/webgl/useGLSurface`（IntersectionObserver mount/pause）+
   `lib/webgl/quality` 设备分级，离屏即掐断。
4. **内容（studio）**：组件只认 `@timcai/content` 的 repository 接口，绝不直连数据文件；
   studio 运行时**禁止** import GSAP/R3F/Three/Lenis（platform guard 强制）。
5. **新增博文**：在 `apps/studio/content/posts/*.mdx` 写 frontmatter + 正文即可。
