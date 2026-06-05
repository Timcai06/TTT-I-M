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


> 每步可独立上线、有 guard 兜底。勾选框直接当 todo 用。
> 文档引用：[01 运行时](./01-runtime-architecture.md) · [02 性能](./02-performance-rendering.md)
> · [03 平台](./03-platform-direction-a.md) · [04 内容层](./04-content-layer.md)
> · [05 守卫](./05-testing-guards.md)

---

## 第一梯队 —— 运行时地基（纯内部重构，视觉零风险，收益最高）

- [ ] **`lib/stage.ts`** 运行时阶段状态机（01·1）
  - [ ] 实现 store + `useStage`（useSyncExternalStore）
  - [ ] Loader 退场处 `setStage('live')`，接管 `intro.ts`
  - [ ] 删 `introExited` / `introExitedOnce` / `busyRef` 三处重复
  - [ ] 验收：`grep` 只剩 stage 内部；e2e 全绿
- [ ] **`lib/scroll/requestRefresh`**（01·2）
  - [ ] rAF 合并 + 关键点立即旁路
  - [ ] 收编 App / lenis / ChapterTransition / TextParticles 的 refresh
- [ ] **转场时 GL 自暂停**（01·1 解锁项 / 02·A6）
  - [ ] Hero / About frameloop 订阅 stage
  - [ ] 验收：transitioning 期间 Hero/About rAF 停止（Performance 录制）

## 可随时单独热修

- [ ] **A1 单图失败永久黑屏**（02·A1）—— 与架构正交，最高优先

## 第二梯队 —— 资源 / GL / 动效

- [ ] **`lib/resources/`** 重构 sitePreload（01·4）
  - [ ] manifest（tier/type） + loaders + preloadController
  - [ ] 失败非致命（含 A1）+ 真实进度喂 Loader
  - [ ] A2：critical 才同步 decode，其余进 idle 队列
- [ ] **`lib/webgl/`**（01·3）
  - [ ] textureCache（修 A8 双重上传）
  - [ ] contextRegistry（canAcquire + 降级信号）
  - [ ] useGLSurface（抽 ParticlePortrait 生命周期契约）
- [ ] **`lib/motion/`**（01·5）
  - [ ] 动效 token + createTransitionTimeline + createHeroParallax
  - [ ] hero parallax 搬回 Hero（修 App→Hero 耦合泄漏）
  - [ ] ChapterTransition 拆 useTransitionConductor / 纯 timeline

## 收尾打磨（CSS / 部署）

- [ ] A3 grain 隔离层 + 移动端静态 PNG 降级
- [ ] A4 disable-hover 去通配符
- [ ] A7 border-radius / box-shadow / backdrop-filter 改合成友好实现
- [ ] A9 hero LCP preload hint
- [ ] A10 chunk 体积预算 guard
- [ ] vercel.json：immutable 资产 + preconnect/preload

## 未来保险 —— 内容层（不碰后端，现在做最划算）

- [ ] **`src/content/`**（04）
  - [ ] schema.ts（含 author / publishState 预留字段）
  - [ ] repositories 接口 + adapters/static
  - [ ] 组件改吃 repository（Projects 试点 → 全量）
  - [ ] 验收：组件不再直 import data/*；换 mock adapter UI 不变

## 守卫升级（贯穿，每梯队完成即补对应守卫）

- [ ] build guard：chunk 体积 / manifest scope / LCP preload（05）
- [ ] Playwright：long-task / LCP / CLS / INP / FPS p95 / context 泄漏（05）
- [ ] 降级路径 e2e：reduced-motion / WebGL 失败 / 404 图（05）

---

## 平台期（方向 A，待 landing 重构稳定后启动）

- [ ] **SOON-1** monorepo 化：`portfolio` → `apps/landing`，抽 `packages/tokens`（03）
- [ ] **SOON-2** 起 `apps/studio`（Next App Router），MDX 博客 SSG
- [ ] **SOON-3** 作品列表/详情吃 repository（static adapter）
- [ ] **SOON-4** OG image / RSS / sitemap / 内容区 SEO
- [ ] **跨边界转场**：View Transitions + 转场皮肤 + stage `navigating`
- [ ] **LATER-1** Auth + Postgres + repository api adapter
- [ ] **LATER-2** UGC 上传（运行时媒体管线）+ 发布状态机
- [ ] **LATER-3** 审核队列 + 配额/限流 + 用户主页

---

## 建议的起点

**第一梯队的 `lib/stage.ts`** 是整个升级的地基：纯内部、视觉零风险，落地后立刻
拿掉三处重复生命周期标志，并解锁「转场时 GL 自暂停」的免费帧率。
其次随时可做 **A1**（与架构正交的硬缺陷）。
