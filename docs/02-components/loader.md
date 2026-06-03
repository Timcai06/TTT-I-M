# 启动屏障 (Loader)

> [!NOTE]
> 本文档基于 `src/components/Loader.tsx` 真实源码编写。它是整个网站的“第一幕”，也是衔接急切渲染与动画解封的关卡。

## 1. 乱码解密特效 (Baffle Scramble)

为了渲染出极客感极强的开场，代码没有使用现成的文字动画库，而是原生手写了一个“黑客解密”特效：

```typescript
const BAFFLE_CHARS = '!<>-_\\/[]{}—=+*^?#█▓▒░█'

charEls.forEach((el) => {
  const final = el.getAttribute('data-final') || el.textContent || ''
  let frame = 0
  const interval = setInterval(() => {
    if (frame < 11) {
      el.textContent = randomBaffleChar()
    } else if (frame < 15) {
      el.textContent = frame % 2 === 0 ? randomBaffleChar() : final
    } else {
      el.textContent = final // 最终锁定真名
      clearInterval(interval)
    }
    frame++
  }, 42)
})
```
文字起初全是无意义的乱码和方块，然后以每帧 42 毫秒的高频闪烁，最终交替渐变为真正的英文字母。

## 2. 精密时序控制与“交接棒” (Hand-off)

Loader 并不是孤立存在的。当 Loader 结束后，下方的 Hero 组件必须“无缝衔接”地开始它的登场动画。

```typescript
const tl = gsap.timeline()
// ... 字母升起，进度条加载
tl.to(count, { v: 100, duration: 1.6 })
// ... 遮罩退去，字母隐藏

/* ── hand off to hero just before the panel clears ── */
tl.call(dispatchIntroExit, [], '>-0.15')

/* ── single panel wipes up, revealing the hero ── */
tl.to(panelRef.current, { yPercent: -100, duration: 1.15 }, '>-0.05')

tl.call(() => setDone(true))
```

> [!IMPORTANT]
> **全局事件派发 (Event Dispatch)**：
> 在黑色面板还没完全抽起离开屏幕之前（`>-0.15`，提前 0.15 秒），Loader 提前通过 `dispatchIntroExit` 向全站广播了“开场结束”事件。
> 此时，早已被挂载并在后台静默潜伏的 `Hero` 监听到该事件，瞬间解封自身的 GSAP Timeline。这就使得面纱揭开的同时，下方的粒子和文字刚好配合着浮现，打造了天衣无缝的电影级转场。

## 3. 完全的自我销毁
当时间轴走完最后一步 `tl.call(() => setDone(true))` 后，组件顶层触发 `if (done) return null`。React 树将彻底卸载掉这个 `<Loader />` 组件节点及其背后的所有 DOM 元素，为后续的滚动性能清理战场。
