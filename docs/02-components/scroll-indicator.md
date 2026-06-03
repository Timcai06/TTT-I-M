# 侧边滚动指示器 (Scroll Indicator)

> [!NOTE]
> 本文档基于 `src/components/ScrollIndicator.tsx` 与 `src/lib/chaptersReady.ts` 的真实源码逆向分析写成。它是一个跨越“同步”与“异步”边界的高难度组件。

## 1. 同步外壳遭遇异步内容

在常规页面中，进度条组件只需简单监听 `window.onscroll`。但本作的架构非常特殊：
- 侧边栏（Chrome/外壳）是**同步急切渲染**的，随首屏立刻出现。
- 目标章节（如 About、Contact 等）是**异步懒加载**的。
如果我们在 `useEffect` 中直接绑定锚点 `#about`，此时 DOM 树中根本不存在该节点，就会导致断点计算崩溃（返回 null 或高度 0），最终所有锚点坍塌挤在视口顶部。

## 2. 解决方案：`chaptersReady` 同步原语

为了解决“先有监听，后有 DOM”的问题，项目底层封装了天才级的 `chaptersReady.ts`。

### 2.1 依赖搜集
它首先遍历 `registry.ts`，把所有需要测量的目标 ID 收集起来。
```typescript
const requiredIds = [...new Set([...navChapters, ...progressChapters].map((c) => c.id))]
```

### 2.2 MutationObserver 自愈监听
如果此时 DOM 没挂载全，它不会轮询（Polling），而是使用原生的 DOM 变动监听器：
```typescript
const observer = new MutationObserver(() => {
  if (allPresent()) { // 当所有所需 ID 都出现在 DOM 树时
    observer.disconnect()
    cb() // 释放被阻塞的绑定动作
  }
})
observer.observe(document.body, { childList: true, subtree: true })
```

## 3. GSAP 触发器的安全委托 (Context Delegation)

在 `ScrollIndicator.tsx` 中，我们真正绑定动画是在收到回调之后：

```typescript
useEffect(() => {
  const ctx = gsap.context(() => {})

  const cancel = onChaptersReady(() => {
    ctx.add(() => {
      sections.forEach((sec, i) => {
        ScrollTrigger.create({
          trigger: `#${sec.id}`,
          start: 'top 50%',
          end: 'bottom 50%',
          onUpdate: (self) => {
             // 独立更新自己这一小节的填充高度
          }
        })
      })
    })
  })

  return () => {
    cancel() // 防御：切断还没发生的 MutationObserver
    ctx.revert() // 拔除：连同后来异步塞进来的 ScrollTrigger 一并抹除
  }
}, [])
```

> [!IMPORTANT]
> **设计精髓**：这套设计做到了绝对的“内存防漏”。即使用户网速极慢，在 DOM 刚刚渲染出来、MutationObserver 刚要触发的那一瞬间，用户就按了路由后退导致 `ScrollIndicator` 被强制卸载，底层的 `cancel()` 和 `ctx.revert()` 双保险依然能精准拦截，杜绝“幽灵事件”驻留。

## 4. 进度条填充算法
有别于全局计算一个大的 `ScrollPercent` 再去切割。现在的设计是：
每一个小段 `<button>` 的高度和 `transform: scaleY()` 都由与其对应的单一章节 `ScrollTrigger` 的 `self.progress` 独立控制。这保证了无论每个章节有多高多矮，当它进入视口中心时，对应的小段一定会平滑填满，完美对齐。
