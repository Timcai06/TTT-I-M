# 核心架构总览 (Architecture Overview)

> [!NOTE]
> 本文档基于 `src/chapters/registry.ts` 与 `src/App.tsx` 的真实源码逆向分析写成。它是理解整个应用结构与数据流向的最前沿入口。

## 1. 注册表驱动的页面组装 (Registry-Driven Composition)

传统的 React 单页应用往往在 `App.tsx` 中硬编码组件层级。本作品集采用了更高级的**单点真实源 (Single Source of Truth, SSOT)** 架构。

### 1.1 `registry.ts` 的核心地位
位于 `src/chapters/registry.ts` 的 `chapters` 数组是整个网站的“基因库”。每个章节（Chapter）被定义为一个对象：
```typescript
export interface Chapter {
  id: string // 绑定到 DOM <section id="...">
  Component: ComponentType | LazyExoticComponent<ComponentType>
  nav?: { label: string } // 是否出现在顶部导航栏
  progress?: { index: string; name: string } // 是否出现在侧边滑动指示器
}
```

**它的衍生链条如下：**
1. **内容区 (`<main>`)**：`App.tsx` 遍历 `chapters` 渲染主要视图。
2. **顶部导航 (`Nav.tsx`)**：过滤出含有 `nav` 属性的章节，自动生成菜单与锚点链接。
3. **滚动指示器 (`ScrollIndicator.tsx`)**：过滤出含有 `progress` 属性的章节，自动生成侧边分段轨道、百分比计算和浮窗提示。

> [!TIP]
> **开发指南**：如果需要增加新章节（例如新增了一个 `Frame`），只需在 `registry.ts` 中新增一个对象。导航栏和滚动轨道会自动伸缩并挂载路由，做到了 100% 的视觉层解耦。

## 2. 混合渲染机制：急切渲染 vs 懒加载 (Eager vs Lazy)

为了将首屏时间 (FCP/LCP) 压缩到极限，项目实施了混合渲染策略。

### 2.1 Hero 区：急切渲染 (Eager Rendering)
在 `registry.ts` 中，`Hero` 组件是直接 `import` 的。它随首屏打包直接下发，在浏览器解析 HTML 时立刻占据视口并播放开场特效，同时将进度状态回调给 `<Loader>`。

### 2.2 视口外区域：懒加载 (Code Splitting)
除 `Hero` 外，其余所有组件（如 `About`, `LifeGallery`, `Frame`, `Projects`）全部使用 `React.lazy()` 进行异步加载。

在 `App.tsx` 中：
```tsx
{chapters.map(({ id, Component }) => (
  // 每一个懒加载组件都被独立的 Suspense 边界包裹
  <Suspense key={id} fallback={null}>
    <Component />
  </Suspense>
))}
```
**为什么是独立的 `<Suspense>`？**
如果只在最外层放一个巨大的 `<Suspense>`，只要有一个底部章节还没加载完，整个应用（包括首屏）就会被迫进入 fallback 状态从而变成白屏。为每一个组件分配独立的边界，保证了首屏渲染的绝对稳定。

## 3. 布局生命周期的自我刷新 (Self-Healing Layouts)

懒加载架构带来了一个致命的工程难题：当后续组件异步挂载到 DOM 树时，整个页面的高度会被突然撑开。这会导致早期计算的所有 GSAP 滚动触发点 (ScrollTrigger) 全部失效。

**解决方案 (`App.tsx`)：**
```typescript
useEffect(() => {
  const refresh = () => ScrollTrigger.refresh()
  // 监听进入动画结束
  window.addEventListener(INTRO_EXIT_EVENT, refresh)
  // 监听所有图片/资源加载完毕
  window.addEventListener('load', refresh)
  // 终极兜底：1.2秒后强制刷新
  const t = window.setTimeout(refresh, 1200)
  return () => { /* ...清理逻辑 */ }
}, [])
```
这种多重事件捕获机制结合 `ScrollTrigger.refresh()` 的幂等特性（Idempotent），确保了即使在网络极差的情况下，动画断点也能进行“自愈”并重新对齐。
