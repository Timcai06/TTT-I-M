# 赛博光标 (Cursor)

> [!NOTE]
> 本文档基于 `src/components/Cursor.tsx` 真实源码编写。剖析了彻底脱离 React 渲染树的 Vanilla DOM 驱动机制。

## 1. 极致顺滑的帧同步跟随 (GSAP Ticker)

为了实现最顶级的 120Hz 丝滑跟随，`Cursor` 组件拒绝使用 `setState` 触发 React 重新渲染（这会导致无法忍受的延迟）。

源码直接劫持了 GSAP 的渲染心跳：
```typescript
const tick = () => {
  const dt = 1 - Math.pow(1 - speed, gsap.ticker.deltaRatio())
  pos.x += (target.x - pos.x) * dt
  pos.y += (target.y - pos.y) * dt
  gsap.set(el, { x: pos.x, y: pos.y })
}

gsap.ticker.add(tick)
```

> [!TIP]
> **物理阻尼算法**：上面的 `dt` 计算融合了 `gsap.ticker.deltaRatio()`。这意味着无论用户的设备是 60Hz 的老式显示器，还是 144Hz 的电竞屏，甚至浏览器发生了掉帧卡顿，光标跟随的物理阻尼感永远是恒定的，绝不会因为帧率不同而导致移动速度忽快忽慢。

## 2. 全局事件委托 (Event Delegation)

当鼠标悬停在按钮上时，光标需要产生吸附放大的特效。如果我们在每一个被渲染的 `<button>` 上去绑定 `onMouseEnter`，不仅代码冗余，而且对于那些**懒加载 (Lazy Load)** 出来的组件（比如稍后才挂载的 Projects 卡片），绑定的时机根本无法控制。

**解决方案：顶级委托**
代码在 `document` 层级拦截了全局的 `mouseover`，利用 DOM 冒泡机制：
```typescript
const isTarget = (node: EventTarget | null): boolean => {
  if (!(node instanceof Element)) return false
  return (
    node.matches('a, button, [data-cursor="hover"]') ||
    node.closest('a, button, [data-cursor="hover"]') !== null
  )
}

const onEnter = (e: MouseEvent) => {
  if (isTarget(e.target)) el.classList.add('is-hover')
}
document.addEventListener('mouseover', onEnter)
```
这使得无论 DOM 树中何时生成了新的 `<a>`、`<button>`，或者带有 `data-cursor="hover"` 的元素，光标都能立刻灵敏地响应它们，实现了 100% 的组件解耦。

## 3. 触屏防御 (Touch Device Immunity)

对于不需要实体光标的移动设备：
```typescript
if (window.matchMedia('(hover: none)').matches) return
```
组件会直接熔断并中止挂载，确保不会有任何冗余的 Ticker 在手机后台耗电。
