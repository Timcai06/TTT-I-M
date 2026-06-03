# 自述模块 (About)

> [!NOTE]
> 本文档基于 `src/components/About.tsx` 真实源码编写。剖析了复杂版式下的独立进场动画以及文字级别的遮罩解密动效。

## 1. 非侵入式的独立动画边界

在复杂的富文本混排模块中，如果把所有元素绑定在同一个 Timeline 上，往往会导致滚动触发点难以协调（比如标题进了视口，但下方的文字还在视口外，却被连带触发了动画）。

`About.tsx` 采用了“各自为战”的防御性设计：
```typescript
gsap.utils
  .toArray<HTMLElement>('.about__block:not(.about__block--manifesto)')
  .forEach((block) => {
    gsap.fromTo(
      block,
      { y: 32, opacity: 0 },
      {
        scrollTrigger: {
          trigger: block, // 每一个段落使用自己作为触发器
          start: 'top 90%',
          toggleActions: 'play none none reverse', // 向上回滚时可恢复初始状态
        },
        // ...
      }
    )
  })
```

## 2. 文字级解密动画 (Manifesto Reveal)

自述板块中最具极客感的是“宣言”（Manifesto）部分的文字解密动画：
```typescript
// Manifesto: scrubbed word-by-word de-blur as the line crosses the band.
revealWords(root.current!, '.about__block--manifesto p')
```
它跳过了常规的透明度渐变，而是引入了外部的 `revealWords` 逻辑，在滚动（Scrub）过程中，将每个词汇从高度模糊（Blur）状态逐个解密为清晰可见，呼应了赛博朋克与构建者的视觉主题。

## 3. 性能优化：GPU 排斥属性的规避

在早期的设计中，头像框的圆角（`border-radius`）变形是与滚动 Scrub 实时绑定的。

**源码留下的技术债务说明：**
> Previously scrub-driven, which repainted `border-radius` on every scroll tick (border-radius can't be GPU-composited). Now it's a single eased tween fired on enter...

由于 `border-radius` 无法被 GPU 硬件加速，每次滚动帧都会引发主线程的全屏重绘 (Repaint)。
现在的 `About` 组件重构为了**进入视口时触发一次性的 Easing 动画 (duration: 1.4s)**，不仅让形变更顺滑，更彻底解放了滚动时的 CPU 压力。

## 4. 动态 SVG 引导线 (Tech Scroll Line)
为了在视觉上引导用户的视线，我们在 Tech Stack 文字旁加入了一条动态描绘的曲线。
代码通过 `path.getTotalLength()` 精确获取了贝塞尔曲线的绝对物理长度，并将其赋值给 `strokeDasharray` 和 `strokeDashoffset`，利用 `scrub: 1.0` 随着向下滚动像拔河一样一点点将其抽离，形成“线条正在往下生长”的错觉。
