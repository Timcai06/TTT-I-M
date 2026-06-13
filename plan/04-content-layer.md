# 04 · 内容层：端口-适配器（已交付 · 稳定参考）

> **状态：已落地、稳定。** 本文从「待办蓝图」降级为「架构参考」——`src/content/` 与
> `packages/content/` 已按本模式实现，代码注释（`content/index.ts`、
> `tests/build/content-layer-guards.mjs`）仍指向本文作为设计依据，故保留。
> 连续体不触碰内容层；本文仅作维护者参考。

## 已实现的接缝

组件**永远不直接 import 静态数据数组**，改为依赖 repository 接口。切后端 = 换 adapter，
UI 零改动。

```
packages/content/（landing 的 src/content/ 为薄再导出）
  schema.ts / index.ts        ← 强类型内容模型，策展 + UGC 共用
  PublishState                ← draft|submitted|in-review|approved|published|rejected（6 态）
  WithMeta<T>                 ← 内容元数据泛型（author / publishState / 时间戳）
  createKeyedStaticRepository ← repository 工厂（同步 all() 给 landing 防异步空帧 +
                                异步 list()/get() 作未来 MDX/DB 契约）
  adapters/static             ← 今天：包当前数据数组
```

## 仍然有效的约束（守卫在管）

- **组件零 `data/*` 直连**：`content-layer-guards.mjs` 断言组件层 `from '.*data/'` == 0。
- **landing 走同步数据**：`all()` 同步返回，避免异步空帧；`list()/get()` 异步作未来契约。
- **manifest 仍 scope=landing**：preload 从 repository 取 URL，但只覆盖 landing 策展内容，
  博客/UGC 不进 manifest（见 [00 原则](./00-principles.md)）。
- **schema 预留 UGC 字段**：`authorId`（现 = "tim"）、`publishState`（现 = 'published'）、
  时间戳——UGC 不另起炉灶，是同一模型 + 发布状态机。

## 为什么保留这份参考

- `content/index.ts` 与 `content-layer-guards.mjs` 的注释引用本文解释「为什么组件不直连
  data」；删了会留下悬空引用。
- 未来接 MDX/DB adapter（LATER 阶段）时，本文是端口-适配器契约的依据。

> 平台层（多 zone、studio、MDX 博客）的完整交付记录见
> [`06-roadmap.md` 的「已交付架构（冻结）」](./06-roadmap.md)。
