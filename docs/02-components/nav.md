# 顶部导航栏 (Nav)

> [!NOTE]
> 本文档基于 `src/components/Nav.tsx` 真实源码编写。剖析了其与页面全局滚动状态的高度解耦。

## 1. 注册表反射 (Registry Reflection)

Nav 组件内部没有手写任何菜单链接，它通过引入全局单例 `navChapters` 实现自我组装：
```typescript
const links = navChapters.map((c) => ({ id: c.id, label: c.nav.label }))
```
这使得任何时候只要修改了 `registry.ts` 中的导航定义，顶部导航栏的 DOM 结构自动更新。

## 2. 活性追踪 (Active State Tracking)

在常规的单页应用中，导航栏高亮往往依赖于 URL 的 Hash 值。但在这个高度复杂的长滚动视差网站中，Hash 变化会有延迟或偏差。

Nav 引入了一个底层的自定义 Hook：`useActiveChapter`。
```typescript
const active = useActiveChapter(navChapters, links[0]?.id ?? '')
```

### 2.1 追踪原理
在 `useActiveChapter` 的底层，并没有使用高开销的 `window.onscroll` 事件去频繁计算 `getBoundingClientRect()`，而是优雅地利用了浏览器的原生 `IntersectionObserver`。
当任何一个被注册的 Section (如 `#projects` 或 `#about`) 的可视面积在屏幕中占据主导地位（通常是交叉比例 `threshold` 达到特定值）时，Observer 触发回调并改变 `active` 状态。

> [!TIP]
> **性能零消耗**：这种设计将复杂的边界计算完全推给了浏览器的底层 C++ 引擎（GPU 线程），做到了在 120Hz 高刷滚动下的 JS 线程“零消耗”。只有当跨越章节边界的瞬间，React 才会触发一次极轻量的重渲染来更新 `.is-active` 的类名。

## 3. 路由更新保护

当用户点击菜单项时：
```tsx
onClick={() => scrollToChapter(l.id, { updateHash: true })}
```
点击并不是简单的一个 `href="#..."` 跳转，而是调用了 `scrollToChapter`，利用 Lenis 进行平滑缓动寻址，随后再静默更新 URL Hash。这避免了原生锚点跳转带来的画面撕裂感和 GSAP 滚动计算的错位。
