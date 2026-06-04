# 02 · 性能 / 渲染层优化

> 守住「复杂但高效、视觉不降级」。每条都标了影响、文件、与对应风险。
> 标 ⚠️ 的是「无论架构怎么走都该做」的硬缺陷。

## 优化清单（按影响排序）

### ⚠️ A1 · sitePreload 单图失败 → 永久黑屏（最高优先，独立可修）
- **现状**：[`sitePreload.ts:330`](../src/lib/sitePreload.ts) 任意图片 rejected 则
  `ready` 永久 false，loader 不退场。Vercel 弱网/404 真实触发。
- **改**：non-critical 失败 → 超时 + 计入完成 + 日志，不阻塞；critical 失败 → 一次重试
  + 超时降级放行。
- **归属**：随 `lib/resources/` 重构落地（见 01·4），但可先单独热修。

### A2 · intro 期 decode storm
- **现状**：[`sitePreload.ts:97`](../src/lib/sitePreload.ts) 对每张图（含全部 frame/
  projects）调 `image.decode()`，几十张大 JPEG 挤主线程 → long task 砸在开场。
- **改**：仅 `critical` 同步 decode，其余 `decode()` 进 idle 队列（复用
  [`lib/scheduleIdle.ts`](../src/lib/scheduleIdle.ts)）。

### A3 · 全屏 mix-blend grain 每帧重混合
- **现状**：[`global.css:118`](../src/styles/global.css) `.grain` fixed 全屏
  `mix-blend-mode: overlay`，下方一重绘就整屏重混合。
- **改**：隔离独立合成层（`transform: translateZ(0)` 并验证下方不强制其重混合）；
  移动端/低 FPS 换静态预栅格 PNG（视觉接近，**不删**）。

### A4 · `.disable-hover *` 通配符 → 滚动时全树 style 重算
- **现状**：[`global.css:209`](../src/styles/global.css) 每 150ms 加/去 class，通配符
  触发整棵 DOM style invalidation。
- **改**：`body:not(.disable-hover) .x:hover` 具体选择器，只覆盖真正有 hover 的元素。

### A5 · ScrollTrigger.refresh() 五处无协调 → thrash
- 见 01·2，统一 `requestRefresh()`。

### A6 · 转场时三个 WebGL context 并发
- 见 01·1，各 GL surface 订阅 stage 自暂停。

### A7 · 非合成属性进动效
- [`footer.css:31`](../src/styles/components/footer.css) `will-change: border-radius` +
  transition border-radius → 改 transform scale / clip-path 近似。
- footer `contact__blob` box-shadow pulse keyframes → 改伪元素 + transform scale +
  opacity「脉冲环」。
- [`projects.css:320`](../src/styles/components/projects.css) `backdrop-filter: blur(6px)`
  → 确认是否在滚动热区；若是，进视口才启用、离开撤掉。
- [`life-gallery.css:54`](../src/styles/components/life-gallery.css) filter 过渡为 hover
  态，`disable-hover` 滚动时已挡，影响有限，低优先。

### A8 · hero 纹理双重 GPU 上传
- 见 01·3 `textureCache.ts`，共享缓存上传一次。

### A9 · LCP 图 preload hint 不明确
- hero 首像加 `<link rel="preload" as="image" fetchpriority="high">` 到 index.html。
- 加 build guard 断言其存在（见 05）。

### A10 · chunk guard 只查存在不查体积
- [`tests/build/chunk-guards.mjs`](../tests/build/chunk-guards.mjs) 加每 chunk gzip 上限：
  react-vendor / gsap-vendor / three-vendor / index 各设阈值，超了 CI 红。

## Vercel 部署侧

- 现有 [`vercel.json`](../vercel.json) 已对 `/(frame|life|projects|portrait)/` 设
  `max-age=604800, stale-while-revalidate`。补：
  - hash 命名的 JS/CSS 资产设 `immutable`（Vite 默认 hash，安全）。
  - hero LCP 图 `preconnect` / `preload`。
  - 确认 HTTP/2，preload hints 不超量（过多 preload 反而抢占带宽）。

## 落地顺序

1. A1（可独立热修，任何时候）
2. 随 01 第一梯队带出 A5 / A6
3. 随 01·4 resources 重构带出 A2
4. 随 01·3 webgl 层带出 A8
5. A3 / A4 / A7 / A9 / A10 作为收尾打磨
