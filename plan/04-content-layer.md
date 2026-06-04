# 04 · 内容层：端口-适配器（现在就做，最便宜的未来保险）

> 不碰任何后端、不依赖方向 A 是否落地，**今天就能做**，成本几乎为零，回报巨大。
> 核心：组件永远不直接 import 静态数据数组；改为依赖 repository 接口。
> 切后端 = 换一个 adapter，UI 零改动。

## 现状的接缝

内容现在是硬编码 TS 模块：
- [`src/data/projects.ts`](../src/data/projects.ts)
- [`src/data/frames.ts`](../src/data/frames.ts)
- [`src/data/life.ts`](../src/data/life.ts)
- [`src/data/about.ts`](../src/data/about.ts) / [`skills.ts`](../src/data/skills.ts)

组件直接 import 这些数组。一旦内容要「不重新部署就能改」或「别人产出」，全得改。

## 目标结构

```
src/content/                  （将来平移到 packages/content/）
  schema.ts                   ← 强类型内容模型，策展 + UGC 共用
  repositories/
    projects.ts               ← interface ProjectsRepo { list(); get(slug); }
    posts.ts                  ← 博客（SOON）
    frames.ts
  adapters/
    static.ts                 ← 今天：包当前硬编码数组
    mdx.ts                    ← SOON：MDX-in-repo（博客）
    api.ts                    ← LATER：fetch / DB / CMS
  index.ts                    ← 根据环境选 adapter，导出 repository 实例
```

## Schema：现在就为 UGC 预留字段

每个内容类型的 schema 在策展内容（你）与 UGC（别人）之间只差几个字段。现在就加上，
哪怕当前全是你、全 `published`：

```
共用基础字段（示意，非最终代码）：
  id            string
  slug          string
  title         string
  ...类型专属字段...

  // ── 为 UGC / 平台化预留（现在填默认值）──
  authorId      string      // 现在 = "tim"
  publishState  'draft' | 'submitted' | 'in-review' | 'published' | 'rejected'
                            // 现在 = 'published'
  createdAt     string
  updatedAt     string
```

这样 UGC 不是另起炉灶，而是同一模型 + 一个发布状态机（见 03）。

## Repository 接口（端口）

```
interface ProjectsRepo {
  list(opts?): Promise<Project[]>     // 列表/分页/过滤
  get(slug): Promise<Project | null>  // 详情
}
```

- 组件只认 `useProjects()` / `getProject(slug)`，**永远不知道**数据从静态数组、MDX
  还是 Postgres 来。
- 注意：landing 当前是同步 import 数组；接口用 Promise 以兼容未来异步源。
  landing 内部可用一个同步 static adapter + 顶层 await/预解析，保持现有体验不变。

## Adapter

- **static.ts（今天）**：直接返回现有 `data/*` 数组，包成 Promise。零行为变化。
- **mdx.ts（SOON）**：读 `content/posts/*.mdx`，front-matter → schema。
- **api.ts（LATER）**：fetch studio 的 API / 直连 DB。

## 迁移步骤（landing 内部，零风险）

1. 建 `src/content/schema.ts`，把 `data/*` 的现有类型升级为带预留字段的 schema。
2. 建 `repositories/*.ts` 接口 + `adapters/static.ts` 包住现有数组。
3. 组件改为从 repository 取数（先一个组件试点，如 Projects）。
4. `data/*` 降级为 `adapters/static.ts` 的内部数据源（或直接并入）。
5. 全量切换后，`grep "from '.*data/"` 在组件层应为 0。

## 验收

- 组件不再直接 import `data/*`。
- 把某个 repository 的 adapter 从 static 换成一个假的 async mock，UI 行为不变（证明解耦）。
- 现有 build guard（`tests/build/frame-architecture-guards.mjs` 等）全绿。

## 与 sitePreload 的关系

- preload manifest（01·4）从 repository 取 URL 列表，而非散落 import。
- 但 manifest 仍 **scope=landing**：只预热 landing 用到的策展内容，
  博客/UGC 内容不进 manifest（00 原则）。
