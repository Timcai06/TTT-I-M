# 06 · 落地路线图（执行入口）

> **状态（plan 01 已落地）** — 第一梯队全部完成 + A1 + 第二梯队 + §5 核心，均通过
> typecheck / eslint / build / 4 个 build guard。新增 lib 边界：
> `lib/stage.ts`、`lib/scroll/requestRefresh.ts`、`lib/webgl/{contextRegistry,useGLSurface,textureCache}.ts`、
> `lib/timelines/{heroParallax,transitionTimeline}.ts`、`lib/resources/{manifest,loaders,preloadController}.ts`。
> 删除 `lib/sitePreload.ts`（拆入 resources/），重写 `tests/build/loader-preload-guards.mjs`。
> 刻意取舍见本次实现说明：保留整站门控（仅修 A1 失败语义）、textureCache 用引用计数而非常驻、
> 未做 motion.ts→motion/ 改名与 token 全量替换、conductor 未单独抽 hook（时间线已抽出后已足够薄）。
> 仍需人工视觉 QA：intro→hero 交接、章节跳转转场（Lenis 冻结/恢复 + GL 暂停）、hero 标题视差、
> About 粒子、Frame 横滚（preview 环境不可靠，用真实浏览器）。
>
> **状态（plan 02 已落地）** — A1/A2/A5/A6/A8/A9 已在 plan 01 或本就到位；本轮新增：
> A4（`.disable-hover *` 通配符 → 依赖 `pointer-events` 继承，去掉每次滚动全树 recalc）、
> A7（footer 状态点 `box-shadow` 无限脉冲 → 合成友好的 `transform: scale()`+`opacity` 伪元素环）、
> A10（`chunk-guards.mjs` 加 gzip 体积预算：three/react/gsap/index/layout 各上限 + 总量 460KB，当前 390.4KB）。
> **刻意不做**：A3 grain（`--noise: 0.015`，1.5% 不透明度全屏 blend 开销可忽略，改动纯属视觉风险换≈0 收益）；
> A7 的 `.contact__blob`（border-radius 形变已在独立合成层上、是签名效果）与 projects `.media-frame__caption`
> 的 `backdrop-filter`（极小、静态、刻意磨砂）保留。均通过 typecheck/eslint/build/4 guard。
>
> **状态（plan 04 已落地）** — 新增 `src/content/`：`schema.ts`（re-export 数据类型 + 预留
> `ContentMeta`/`PublishState`，默认 author=tim、published）、`repositories.ts`（`CollectionRepository`：
> 同步 `all()` 给 landing 防异步空帧 + 异步 `list()/get()` 作未来 MDX/DB 契约）、
> `adapters/static.ts`、`index.ts`（repository 实例 + 同步数据再导出）。12 处组件导入从 `data/*`
> 改到 `content`（`resources/manifest.ts` 作为 preload 基础设施保留 `data/*` 直连）。新增
> `tests/build/content-layer-guards.mjs`（组件零 `data/*` 直连 + 接口/schema 契约）并接入 test:build。
> **零渲染行为变化**：landing 仍走同步数据。5 个 build guard 全绿。这是 plan 03 平台层的地基。
>
> **状态（plan 02.5 性能/视觉硬化进行中）** — 在进入 plan 03 前，先处理 landing 自身运行时预算：
> B2 图片 decode 风暴已改为「critical gate + deferred 原生 lazy + 近屏 idle decode 队列」；
> B5 常驻 loop 已改为 Cursor / Pretext 空闲停机，并把 active chapter + 右侧进度条合并到
> `chapterScrollMetrics` 单一布局快照源。Frame 的 Building/Cuisine 改为比例保真布局：
> 不使用 `object-fit: cover`，不重叠，保留错位层次与主次，新增 e2e 约束检查可见图片尺寸、
> caption 贴合、真实比例、无裁切、无重叠。B3 已新增 `webgl/quality`：按设备能力动态调整
> Hero portrait segments / About text particle targets / Transition field particles 与 DPR，并让 optional
> WebGL surface 走动态 context budget。B4 grain 已保留桌面闲置 overlay 风格，但在滚动压力
> `.disable-hover` 与移动/触屏设备切换到静态 PNG + normal blend，避免高压滚动窗口全屏重混合。
> **更新（2026-06-07）**：根据真实 QA 回退 B2 的「deferred 不门控」取舍：
> loader 现在重新门控完整 landing manifest，critical 先跑、deferred 图片按并发队列 eager fetch +
> idle decode，进度条只显示真实 completed/total；Frame archive DOM 图片改为 eager，避免进入 Frame
> 时仍依赖原生 lazy 触发。
>
> **状态（plan 03 平台化地基已落地）** — repo 已切为 npm workspaces：`apps/landing`
> 承载原 Vite landing，`apps/studio` 承载 Next App Router 内容面，`packages/tokens`
> 与 `packages/content` 提供共享 token/schema/repository。studio 已有 `/blog`、`/work`、
> `/dashboard`、RSS、sitemap、OG image 基础输出，并通过 guard 保证不依赖 GSAP/R3F/Three/Lenis/preload。
> **状态（plan 03-A 已落地）** — Studio 现在已有真实内容生产入口：
> `apps/studio/content/posts/*.mdx` + frontmatter → `readPosts()` → repository → `/blog`、
> `/blog/[slug]`、RSS、sitemap。Landing 同步接入 Vercel Analytics 与 Speed Insights，
> 挂在 `App` 最外层 fragment 内，不改变章节运行时结构。
>
> **代码级审计（2026-06-05，历史快照）** — typecheck（landing+studio）✅、landing build + 6
> guard ✅（JS 393.7KB/460）、studio Next build ✅（12 路由 SSG）。plan 01/02/02.5/04/03/03-A
> 在代码层**真实落地**，且 02.5 的 `webgl/quality`、`chapterScrollMetrics`、`imageDecodeQueue`
> 是有质量的实现而非占位。该审计暴露的问题后续已闭环：
> - ✅ **bug 修复在树**：`intro.ts` FIX 1（footer blob 提前 + pretext 消失）已落地；pretext 已修。
> - ✅ **控制台噪音已修**：`loaders.ts` 清理 fonts 6000ms 误报定时器、静默 idle decode best-effort 噪音。
> - ✅ **跨 zone 资源路由已修复**：`/_next/:path*` rewrite 位于 root `vercel.json` 第一项，
>   `platform-guards.mjs` 锁顺序，`tests/runtime/cross-zone-smoke.mjs` 做线上 `/blog`/`/work`/`/dashboard`
>   HTML + `/_next` 资产 200 运行时复验。
> - ✅ **真 MDX 已落地**：studio 改用 `next-mdx-remote/rsc` + `gray-matter`，不再是手写 markdown 子集。
> - ✅ **守卫盲区已缩小**：跨 zone smoke、降级 e2e、INP/FPS-p95、deferred-image byte guard 已补；
>   剩余缺口是重复章节跳转后的 WebGL context 泄漏门。
> - 🟡 **Frame cuisine/scenery**：合法 webp 但背景 `decode()` 偶发拒绝（非致命，DOM 仍显示）；
>   建议用 sharp 重编码消除非对称噪音（buildings 不报）。


> **状态（2026-06-10 优化轮）** — ① loader 闸门拆分落地（00 原则·修复②）：intro 退场改由
> `criticalReady` 门控，deferred 图片退场后继续后台并发拉满（总下载量不变）；进度条改显
> critical 进度；e2e LCP 预算 4200→2800（CI 6000→4500）；`loader-preload-guards.mjs`
> 锁双向契约。② 新增跨 zone 运行时冒烟 `tests/runtime/cross-zone-smoke.mjs`
> （`npm run test:smoke` + CI `cross-zone-smoke` job，main push 阻塞）——补上 2026-06-05
> 事故的运行时盲区。③ studio `next` 从 `latest` 锁到 `^16.2.7`。④ docs/01、docs/03、
> docs/05 过期结论（/_next 404、手写 MDX）已同步为已修复状态。
>
> 每步可独立上线、有 guard 兜底。勾选框直接当 todo 用。
> 文档引用：[01 运行时](./01-runtime-architecture.md) · [02 性能](./02-performance-rendering.md)
> · [03 平台](./03-platform-direction-a.md) · [04 内容层](./04-content-layer.md)
> · [05 守卫](./05-testing-guards.md)

---

> ✅ **勾选框已同步真实代码状态（2026-06-06）**。`[~]` = 部分完成。

## 第一梯队 —— 运行时地基（纯内部重构，视觉零风险，收益最高）

- [x] **`lib/stage.ts`** 运行时阶段状态机（01·1）
  - [x] 实现 store + `useStage`（useSyncExternalStore）
  - [x] Loader 退场处 `setStage('live')`，接管 `intro.ts`
  - [x] 删 `introExited` / `introExitedOnce` / `busyRef` 三处重复
  - [x] 验收：`grep` 只剩 stage 内部；e2e 全绿
- [x] **`lib/scroll/requestRefresh`**（01·2）
  - [x] rAF 合并 + 关键点立即旁路
  - [x] 收编 App / lenis / ChapterTransition / TextParticles 的 refresh
- [x] **转场时 GL 自暂停**（01·1 解锁项 / 02·A6）
  - [x] Hero / About frameloop 订阅 stage

## 可随时单独热修

- [x] **A1 单图失败永久黑屏**（02·A1）—— preloadController 失败非致命 + 超时

## 第二梯队 —— 资源 / GL / 动效

- [x] **`lib/resources/`** 重构 sitePreload（01·4）
  - [x] manifest（tier/type） + loaders + preloadController
  - [x] 失败非致命（含 A1）+ 真实进度喂 Loader
  - [x] A2：decode 走 idle 队列（`imageDecodeQueue`，02.5/B2）
- [x] **`lib/webgl/`**（01·3）
  - [x] textureCache（引用计数；A8 双重上传按卸载释放设计刻意保留，见 01 文档）
  - [x] contextRegistry（canAcquire + 降级信号）
  - [x] useGLSurface（抽 ParticlePortrait 生命周期契约）
  - [x] `webgl/quality` 设备分级（02.5/B3）
- [~] **timelines/**（01·5）
  - [x] `createTransitionTimeline` + `createHeroParallax`
  - [x] hero parallax 搬回 Hero（修 App→Hero 耦合泄漏）
  - [ ] ChapterTransition 拆 `useTransitionConductor`（**刻意暂缓**：时间线抽出后 conductor 已够薄，低价值）
  - [ ] 动效 token 全量替换（未做：与 `motion.ts` 命名冲突，纯外观，低价值）

## 收尾打磨（CSS / 部署）

- [x] A3/B4 grain：滚动压力/移动端静态 PNG 降级（A3 桌面 1.5% 开销可忽略，刻意不动）
- [x] A4 disable-hover 去通配符（改 `pointer-events` 继承）
- [x] A7 footer dot box-shadow pulse → 合成友好（blob/caption 刻意保留，见 02 文档）
- [x] A9 hero LCP preload hint（index.html 已有 `fetchpriority=high`）
- [x] A10 chunk 体积预算 guard（`chunk-guards.mjs` gzip 预算）
- [x] vercel.json：preconnect/preload（hashed 资产由 Vercel 自动 immutable）

## 未来保险 —— 内容层（不碰后端，现在做最划算）

- [x] **`src/content/`**（04）
  - [x] schema.ts（含 author / publishState 预留字段）
  - [x] repositories 接口 + adapters/static
  - [x] 组件改吃 repository（12 处全量）
  - [x] 验收：`content-layer-guards` 保证组件不直 import data/*

## 守卫升级（贯穿，每梯队完成即补对应守卫）

- [x] build guard：chunk 体积 / content scope / platform / loader-preload（05）
- [~] Playwright：long-task / LCP / CLS / heap / scroll / stage / overlay / INP / FPS p95 已做；
  **context 泄漏门未做**（05）
- [x] 降级路径 e2e：reduced-motion / WebGL 失败 / 404 图（`degradation.spec.ts`，**CI 阻塞**）
- [x] **CI 强制**：verify 阻塞（两 app typecheck/lint + studio build + 6 guard）
  + e2e-gates 阻塞（degradation 确定性子集）+ e2e 顾问（scroll/perf 全量）

---

## 平台期（方向 A，待 landing 重构稳定后启动）

- [x] **SOON-1** monorepo 化：`portfolio` → `apps/landing`，抽 `packages/tokens`（03）
- [x] **SOON-2** 起 `apps/studio`（Next App Router），MDX-in-repo 博客 SSG
- [x] **SOON-3** 作品列表/详情吃 repository（static adapter）
- [x] **SOON-4** OG image / RSS / sitemap / 内容区 SEO 基础输出
- [x] **跨 zone 资源路由**：`/_next/:path*` rewrite（2026-06-06 修复，原 /blog 主域资源 404）
- [x] **真 MDX**：`next-mdx-remote/rsc` + `gray-matter`（2026-06-06，替换手写 markdown 子集）
- [~] **跨边界转场**：跨文档 View Transitions 已开启（`tokens.css` `@view-transition: auto`，
  双 app 同源 opt-in，prod blog 链接改同源 `/blog`，reduced-motion 跳过；Chrome 126+ 渐进增强）。
  **未做**：转场皮肤（复用 GL 粒子场）+ stage `navigating` 阶段 + 命名共享元素
- [ ] **LATER-1** Auth + Postgres + repository api adapter
- [ ] **LATER-2** UGC 上传（运行时媒体管线）+ 发布状态机
- [ ] **LATER-3** 审核队列 + 配额/限流 + 用户主页

---

## 下一步候选（2026-06-06，01/02/02.5/04 + 03-SOON 已完成）

按价值排序，剩余未做：
1. **Studio 视觉**：blog/work 仍是基础文本版，与 landing 气质脱节（用户可见差距最大）
2. **跨边界转场**：landing→blog 硬切加 View Transitions（电影感连续性）
3. **05 守卫补全**：补 repeated chapter jump 的 WebGL context 泄漏门；
   继续把确定性 e2e 子集从「CI 顾问」提回「CI 阻塞」
4. **LATER-1 起步**：Auth + Postgres（为 UGC 铺路）
5. **01 收尾**：ChapterTransition 拆 `useTransitionConductor`（低价值）
