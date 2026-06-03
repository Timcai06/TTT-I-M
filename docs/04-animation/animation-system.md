# 动画系统与时序编排 (Animation & Orchestration)

> [!NOTE]
> 本文档基于 `src/lib/lenis.ts` 与 `src/components/ScrollIndicator.tsx` 等真实源码逆向分析写成。揭示了如何安全地在懒加载环境下使用 GSAP。

## 1. 全局滚动中枢：Lenis 与 GSAP 的完美融合

传统的平滑滚动（Smooth Scrolling）往往会和 GSAP `ScrollTrigger` 产生抖动或计算偏差。本项目在 `src/lib/lenis.ts` 中构建了一个统一的动画跳动（Ticker）中枢。

### 1.1 统一 Ticker 驱动
```typescript
const tickerFn = (time: number) => {
  lenis.raf(time * 1000)
}
// 1. 让 GSAP 的原生 Ticker 接管 Lenis 的帧渲染
gsap.ticker.add(tickerFn)
// 2. 彻底关闭 GSAP 自带的滞后平滑，防止两个平滑算法冲突打架
gsap.ticker.lagSmoothing(0)
```
这段基建确保了所有基于滚动的特效（如光标滞后、SVG 变形、文字逐行出现）与原生滚动体验**100% 帧同步**，绝不撕裂。

## 2. 异步 GSAP 实例的安全销毁 (Safe Destruction)

在常规的 React 单页应用中，通过 `useEffect` 配合 `return () => ctx.revert()` 就能完美注销动画。
**但本项目的极速按需加载架构带来了挑战**：因为目标 DOM（如下方的 Projects 章节）还没挂载，我们必须等 `chaptersReady` 触发后才能去 `ScrollTrigger.create(...)`。这导致创建动作变成了“未来的异步行为”。

### 2.1 闭包注入：`ctx.add()`
在 `src/components/ScrollIndicator.tsx` 中，我们采用了高级的上下文注入范式：

```typescript
useEffect(() => {
  // 1. 创建同步的 GSAP 上下文
  const ctx = gsap.context(() => {})

  // 2. 开启异步监听
  const cancel = onChaptersReady(() => {
    // 3. 当 DOM 准备就绪时，把异步生成的 ScrollTrigger 强行塞进早前的 ctx 中！
    ctx.add(() => {
      sections.forEach((sec) => {
        ScrollTrigger.create({ trigger: `#${sec.id}` /* ... */ })
      })
    })
  })

  // 4. 清理函数：即使是未来塞进去的 Trigger，也会被这一句 revert() 一网打尽，彻底销毁
  return () => {
    cancel()
    ctx.revert()
  }
}, [])
```
> [!IMPORTANT]
> **底层防御**：如果在 `chaptersReady` 触发之前（即 DOM 还在下载时），用户极其疯狂地按了浏览器的“后退”按钮导致组件卸载，`cancel()` 会截断 MutationObserver，`ctx.revert()` 会清空同步上下文。没有任何游离的“幽灵触发器”会残留在内存中。
