# 00 · 不可违背的原则

> 这些是所有优化的护栏。任何一条改动若违背本页，停下来重新设计。

## 视觉「绝不牺牲」五原则

1. **降级而非删除**
   每个昂贵效果都必须有一个「视觉等价或近似」的廉价路径，绝不直接移除。
   - grain SVG turbulence → 移动端/低 FPS 换静态预栅格 PNG（视觉接近）
   - 转场 GL 粒子场 → context 紧张时退化为 CSS 粒子 / clip-path
   - 粒子预算 → 移动端减半（已实现，是范本）

2. **降级触发条件统一**
   所有降级走同一套判定：`prefers-reduced-motion` / `(hover:none)` /
   WebGL context 预算 / 运行时低 FPS 自适应。不要每个组件各写一套。

3. **滚动帧内只动 transform 和 opacity**
   其它一切（`filter` / `box-shadow` / `border-radius` / `clip-path` /
   `backdrop-filter` / `mix-blend-mode`）只允许出现在**非滚动的一次性过渡**里，
   且必须在 `disable-hover` 期间被冻结。

4. **画质用「加载策略」换，不用「压缩质量」换**
   能动的是：解码时机、`fetchpriority`、`decode()` 调度、srcset 命中正确尺寸。
   不能动的是：源图质量、动效质感、排版层次。

5. **效果可逆**
   任何效果都能被运行时 FPS 监测降级后再恢复，不留视觉残影。
   `introExitedOnce` 的「瞬时复现」思路是范本。

## 性能不变量（Invariants）

- **mix-blend 是预算资源**：全屏 blend 最多一层（grain）。其余 blend 元素必须小面积，
  且不在滚动重绘热区。
- **每个 WebGL context 都要登记**：常驻 context 数量是硬预算。新增 GL 效果先问
  `contextRegistry.canAcquire()`。
- **整站预热的边界 = landing**：`sitePreload` / resource manifest 永远只覆盖 landing
  这一个有界、策展的资产集。博客 / 作品 / UGC（无限增长）**绝不进 preload**，走
  懒加载 / SSR。
- **内容区是轻运行时**：博客/作品页**绝不** import GSAP / R3F / Lenis / sitePreload。
- **失败不致命**：任何 non-critical 资源失败都不得阻塞首屏 `ready`。

## 「整站预热」专项约束（已定为项目决策）

`src/lib/sitePreload.ts` 故意在 loader intro 退场前预热**所有** landing 图片。
这是有意的：连续影像/暗房质感的作品集不允许快速下滑时出现 pop-in。

- ✅ 保留：激进整站预热的**意图**。
- 🔧 修复：① 单图失败导致永久黑屏的缺陷（见 02 · A1）；
  ② 可选地把「门控 intro 的部分（critical）」与「intro 退场后继续后台拉满的部分
  （deferred）」分开——总下载量不变，只缩小黑屏闸门。
- ❌ 不要：把它当成 naive 性能问题，改成懒加载/按视口加载。
