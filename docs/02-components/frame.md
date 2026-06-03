# 帧视窗相册 (Frame)

> [!NOTE]
> 本文档基于 `src/components/Frame.tsx` 真实源码编写。该组件承载了大型横向画廊（Horizontal Scroll），是“垂直页面中的水平宇宙”。

## 1. 架构级横向滚动 (Horizontal Scrolling)

在传统的纵向网页中插入横向滑动，是非常考究性能和交互设计的。`Frame.tsx` 没有使用原生 CSS 滚动捕捉（Scroll Snap），而是通过 GSAP 将“向下滚动”映射为“向左/向右平移”。

### 1.1 滚动距离精密计算
```typescript
const scrollDistance = () => Math.max(1, trackEl.scrollWidth - window.innerWidth)

const tween = gsap.fromTo(trackEl,
  { x: () => (theme.direction === 'left-to-right' ? -scrollDistance() : 0) },
  {
    x: () => (theme.direction === 'left-to-right' ? 0 : -scrollDistance()),
    ease: 'none',
    scrollTrigger: {
      trigger: sectionEl,
      pin: true,
      scrub: 1, // 带 1 秒阻尼的丝滑跟随
      end: () => `+=${scrollDistance()}`, // 用横向距离替代纵向滚动距离
    }
  }
)
```
> [!TIP]
> **动态自适应**：这里所有的位置参数和距离都没有写死数字，而是全部以函数 `() => ...` 的形式传入，结合 `invalidateOnRefresh: true`，当图片懒加载撑开 `trackEl.scrollWidth` 时，GSAP 会自动重新计算整个轨道的真实长度，防止滚不到头或滚动越界。

## 2. 状态映射与 UI 联动 (State Sync)

当画面横向平移时，左侧固定（Pinned）的轨道指示器 `ArchiveRail` 需要实时显示“你现在看到的是第几个 Cluster”。

### 2.1 requestAnimationFrame 极速刷新
由于 `scrollTrigger.onUpdate` 在用户疯狂滚动时触发频率极高，直接在里面调用 React 的 `setState` (比如 `setActive`) 会导致整个组件剧烈重新渲染，严重卡顿。

**源码对策**：
```typescript
const updateActiveCluster = (progress = 0) => {
  window.cancelAnimationFrame(activeUpdateFrame.current)
  activeUpdateFrame.current = window.requestAnimationFrame(() => {
    const clusterCount = theme.clusters.length
    const clusterIndex = Math.min(clusterCount - 1, Math.max(0, Math.floor(progress * clusterCount)))

    if (clusterIndex === activeClusterIndex.current) return // 无改变则拦截
    activeClusterIndex.current = clusterIndex
    setActive({ clusterIndex }) // 触发 React UI 更新
  })
}
```
把高频的回调卡在下一帧执行，并增加“相等则短路”的判断，把原本可能每秒几百次的 React 调和（Reconciliation）压制到了个位数。

## 3. 动态加载下的高度补偿
图片因为使用 `<img loading="lazy">`，刚开始高度为 0，随着滚动图片加载出来，轨道变长，原本固定的 `ScrollTrigger` 断点会瞬间崩盘。
代码中为此增加了极为精密的补偿监听：遍历轨道内所有的 `<img />`，监听它们的 `load` 事件，利用防抖 `scheduleRefresh`，在图片成型后立刻安全唤起 `ScrollTrigger.refresh()`。
