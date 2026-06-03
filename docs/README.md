# Portfolio — Tim Cai

> 一个以 WebGL 粒子肖像为视觉锚点，极致工程化打底的个人作品集站点。
> **技术栈**：React 18 + TypeScript + Vite + GSAP + Three.js (R3F)。

---

## 📖 文档中枢 (Map of Content)

这里的每一篇文档均基于**代码即真理 (Code as Single Source of Truth)** 原则编写，100% 映射最新的底层源代码，拒绝凭空架构。

### 01. 核心架构与基建 (Architecture & Infrastructure)
如果您想了解项目是如何进行模块解耦和极速加载的，请阅读以下章节：
- [核心架构总览 (Overview)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/01-architecture/overview.md) - 解析 `registry.ts` 驱动模式与混合懒加载机制。
- [性能优化与构建策略 (Performance Optimization)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/01-architecture/performance-optimization.md) - 解析 Vite 分包拆离机制与交互降级。

### 02. 动画与时序编排 (Animation Orchestration)
如果您想了解复杂的滚动特效和 GSAP 的防泄漏机制，请阅读以下章节：
- [动画系统与时序编排 (Animation System)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/04-animation/animation-system.md) - 解析 GSAP `ctx.add()` 异步托管与 Lenis 单例劫持。

### 03. 高阶组件深度解剖 (Component Deep Dives)
对代码最复杂、视觉冲击力最强的核心组件逐一拆解：
- [WebGL 粒子肖像系统 (Particle Portrait)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/particle-portrait.md) - 解析 GPU 节流与垃圾回收机制。
- [侧边滚动指示器 (Scroll Indicator)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/scroll-indicator.md) - 解析 `MutationObserver` 是如何实现自愈（Self-healing）绑定的。
- [首屏视觉系统 (Hero Section)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/hero.md) - 解析首屏急切渲染与加载器握手时序。
- [页脚交互系统 (Footer & CTA)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/footer.md) - 解析 GSAP 时间轴排版与多米诺骨牌级特效。

---

## 🎯 面向未来的开发指南

1. **新增章节**：只需要修改 `src/chapters/registry.ts`，全站的侧边栏、导航栏、锚点路由会自动为您处理完毕。
2. **新增动效**：切记，如果是针对懒加载 DOM（非首屏）的滚动特效，请务必使用 `onChaptersReady` 结合 `gsap.context().add()`，以免发生极端的生命周期泄漏。
3. **增加高渲染开销组件**：务必模仿 `ParticlePortrait`，加入 `IntersectionObserver` 判定。如果它不在视口内，请掐断它的计算资源。
