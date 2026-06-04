# Portfolio 架构升级计划

本目录是这个项目从「单页影像作品集」演进为「landing + 内容平台」的完整工程蓝图。
所有文档面向执行：每条建议都落到文件级，带步骤、验收标准与风险。

## 三个层次

1. **性能 / 渲染层** —— 守住「复杂但高效、视觉不降级」。见 [`02-performance-rendering.md`](./02-performance-rendering.md)
2. **运行时架构层** —— 补一层「运行时 SSOT」，解耦散落的状态机。见 [`01-runtime-architecture.md`](./01-runtime-architecture.md)
3. **平台化层** —— landing 原样保留，内容平台另起 Next.js（**方向 A，已锁定**）。见 [`03-platform-direction-a.md`](./03-platform-direction-a.md)

配套：
- [`00-principles.md`](./00-principles.md) —— 不可违背的视觉/性能原则（先读）
- [`04-content-layer.md`](./04-content-layer.md) —— 内容层端口-适配器（最便宜的未来保险，现在就做）
- [`05-testing-guards.md`](./05-testing-guards.md) —— 构建守卫 + 性能门
- [`06-roadmap.md`](./06-roadmap.md) —— 分期落地顺序与勾选清单（执行入口）

## 决策记录（Decision Log）

| 决策 | 选择 | 理由 |
|---|---|---|
| 整站预热是否保留 | **保留**（只改失败语义+分层） | landing 有界策展，零 pop-in 是有意的产品体验，不是 naive perf bug |
| 渲染分叉方向 | **方向 A：多 zone** | landing 不动（珠宝不冒迁移风险）；内容平台用 Next 拿 SSR/SEO/后端 |
| 博客内容源 | MDX-in-repo（git 即 CMS） | 你是设计师开发者，MDX 又快又强，无需 DB |
| UGC 内容源 | Postgres + 运行时媒体管线 | 多用户/审核/上传需要关系型 + 运行时 CDN |
| 内容访问 | repository 接口 + adapter | 切后端 = 换 adapter，UI 零改 |

## 核心诊断（一句话）

> 你已经有「**组合的单一事实源**」（`src/chapters/registry.ts`），
> 但缺「**运行时的单一事实源**」——运行时状态散落在 window 事件 / 模块标志 /
> MutationObserver / Context / GSAP 全局五套机制里。
> 本计划的地基就是把它收敛成一个显式状态机（`lib/stage.ts`）。

## 执行顺序速览

| 梯队 | 内容 | 风险 | 文档 |
|---|---|---|---|
| 第一梯队 | stage 机 → scroll 协调 → 转场时 GL 自暂停 | 极低（纯内部，视觉零改） | 01 |
| 第二梯队 | resources 重构 + 修黑屏 → webgl 层 → motion 工厂 | 低 | 01 / 02 |
| 未来保险 | 内容层 repository 化 + schema 预留 UGC 字段 | 极低 | 04 |
| 平台期 | 起 Next 内容区 → 博客/作品 → UGC | 中（新代码库） | 03 |

详见 [`06-roadmap.md`](./06-roadmap.md)。
