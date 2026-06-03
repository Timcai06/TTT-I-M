# 项目画廊 (Projects)

> [!NOTE]
> 本文档基于 `src/components/Projects.tsx` 真实源码编写。剖析了数据驱动的大型卡片阵列，以及由独立 Ticker 驱动的 3D 鼠标跟随倾斜动效。

## 1. 数据驱动的 UI 组装

Projects 组件不包含冗长的硬编码 DOM，而是完全依赖于底层的 `src/data/projects.ts` 强类型接口进行渲染：
```typescript
{projects.map((p) => (
  <article className="project-card" key={p.id} data-accent={p.accent}>
    // ...
    <ProjectMedia project={p} />
  </article>
))}
```
在组件挂载时，会遍历所有 `.project-card`，并将其身上挂载的 `data-accent` 颜色变量动态注入为其行内 CSS 变量：
```typescript
card.style.setProperty('--accent', accent)
```
这使得每一个项目的标题、装饰线和按钮在悬停时都能呈现符合其项目调性的专属色彩。

## 2. 脱离主上下文的 3D 悬浮 (Tilt Mechanism)

在 `Projects.tsx` 中，除了普通的页面滚动出现效果（通过 GSAP `onEnter` 挂载 `is-visible` 类名）外，还包含一个极度消耗性能的交互：**鼠标跟随 3D 倾斜**。

### 2.1 独立的 Ticker 管理
在源码中有一段非常特殊的声明：
```typescript
// Pointer-following 3D tilt on each media frame (no-ops on touch / reduced motion). 
// Lives outside the gsap.context — it owns its own ticker/listeners and is torn down explicitly below.
const tiltDisposers = gsap.utils
  .toArray<HTMLElement>(root.current.querySelectorAll('.media-frame'))
  .map((frame) => attachTilt(frame))
```

> [!IMPORTANT]
> **架构防御**：普通的 ScrollTrigger 动画可以直接塞进 `gsap.context()` 里，利用 `.revert()` 一次性自动清理。但 `attachTilt` 内部为了达到极致的流畅度，直接挂载了原生的 `mousemove` 监听器和它自己的 `requestAnimationFrame` 轮询。
> 源码故意将其拆出 `context` 之外，并在 `return () => { tiltDisposers.forEach(...) }` 中**显式、手动地销毁**，彻底避免了 SPA 路由切换时产生的野生事件监听器泄漏。

## 3. 多媒体交互图层 (ProjectMedia)
根据数据中 `project.media.kind` 的不同（如 `terminal`, `data`, `cinematic`），卡片右侧的展示区会渲染出截然不同的外壳（如 macOS 终端圆点、极客框线或电影感四角对焦框）。同时内部带有缩略图点击切换逻辑（`setActive`），为枯燥的项目介绍增添了极强的把玩感。
