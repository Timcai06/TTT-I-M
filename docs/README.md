# Portfolio — Tim Cai

> 一个以 WebGL 粒子肖像为视觉锚点，极致工程化打底的个人作品集站点。
> **技术栈**：React 18 + TypeScript + Vite + GSAP + Three.js (R3F)。

---

## 📖 文档中枢 (Map of Content)

这里的每一篇文档均基于**代码即真理 (Code as Single Source of Truth)** 原则编写，100% 映射最新的底层源代码，拒绝凭空架构。

### 01. 核心架构与基建 (Architecture & Infrastructure)
- [核心架构总览 (Overview)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/01-architecture/overview.md) - 解析 `registry.ts` 驱动模式与混合懒加载机制。
- [性能优化与构建策略 (Performance Optimization)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/01-architecture/performance-optimization.md) - 解析 Vite 分包拆离机制与交互降级。

### 02. 动画与时序编排 (Animation Orchestration)
- [动画系统与时序编排 (Animation System)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/04-animation/animation-system.md) - 解析 GSAP `ctx.add()` 异步托管与 Lenis 单例劫持。

### 03. 高阶组件深度解剖 (Component Deep Dives)
所有业务组件文档均已重写并 100% 覆盖，解析精确至代码行与生命周期边界：

**▶ 核心与交互级组件**
- [WebGL 粒子肖像系统 (Particle Portrait)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/particle-portrait.md) - GPU 节流、鼠标排斥与显存垃圾回收。
- [人生画廊 (Life Gallery)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/life-gallery.md) - 详解 GSAP Flip 在 Bento 到全屏过渡中的应用及响应式自愈。
- [帧视窗相册 (Frame)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/frame.md) - 横向滚动 (Horizontal Scrolling) 的数学映射与 requestAnimationFrame 性能压制。
- [项目画廊 (Projects)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/projects.md) - 数据驱动渲染与独立 Ticker 接管的 3D 鼠标跟随倾斜。

**▶ 辅助与导航组件**
- [侧边滚动指示器 (Scroll Indicator)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/scroll-indicator.md) - MutationObserver 自愈绑定机制。
- [首屏视觉系统 (Hero Section)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/hero.md) - 混合渲染与首屏急切加载策略。
- [页脚交互系统 (Footer & CTA)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/footer.md) - GSAP Timeline 交错 (Stagger) 揭示。
- [技能矩阵 (Skills)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/skills.md) - 100% 动态计算的三次贝塞尔 (Cubic Bezier) SVG 蛇形曲线生长算法。
- [自述模块 (About)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/about.md) - 文字级模糊解密 (revealWords) 与非侵入式滚动边界。
- [顶部导航栏 (Nav)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/nav.md) - 零开销 IntersectionObserver 活性追踪与路由平滑替换。
- [启动屏障 (Loader)](file:///Users/tim/Desktop/TTT%20I'M/portfolio/docs/02-components/loader.md) - 乱码黑客解密阵列与全局加载状态派发。
- [赛博光标 (Cursor)](file:///Users/tim/Desktop/TTT%20I%27M/portfolio/docs/02-components/cursor.md) - 脱离 React 渲染树的 GSAP Ticker 阻尼跟手及全局 DOM 委托吸附。

---

## 🎯 面向未来的开发指南
1. **新增章节**：只需要修改 `src/chapters/registry.ts`，全站的侧边栏、导航栏、锚点路由会自动为您处理完毕。
2. **新增动效**：切记，如果是针对懒加载 DOM（非首屏）的滚动特效，请务必使用 `onChaptersReady` 结合 `gsap.context().add()`，以免发生极端的生命周期泄漏。
3. **增加高渲染开销组件**：务必模仿 `ParticlePortrait`，加入 `IntersectionObserver` 判定。如果它不在视口内，请掐断它的计算资源。
