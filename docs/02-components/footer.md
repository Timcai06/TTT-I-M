# 页脚交互系统 (Footer & CTA)

> [!NOTE]
> 本文档基于 `src/components/Footer.tsx` 真实源码编写。深入剖析了由 GSAP 时间轴驱动的现代动效编排。

## 1. 复杂 GSAP 时间轴编排 (Timeline Orchestration)

页脚动画不是单一元素的滚动触发，而是通过 `gsap.timeline` 将多个独立的 DOM 节点串联在一条**滚动进度线 (Scrub)** 上。

```typescript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: rootEl,
    start: 'top bottom',
    end: 'bottom bottom',
    scrub: true,
  },
})

// 时间轴堆叠编排
tl.fromTo(blobRef.current, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
tl.to('.footer__inner', { opacity: 1, duration: 0.1, ease: 'none' }, 0.18)
tl.to('.footer__kicker', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.18)
tl.to('.footer__title .split-line__inner', { yPercent: 0, skewY: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.22)
tl.to('.contact__btn', { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)
```

> [!TIP]
> **设计原理**：Timeline 的最后一个参数（如 `0.18`, `0.22`）代表动画插入的时间戳，单位是与滚动总进度的相对比例。这使得背景液态球先于文字放大出现，而文字又按照 staggered 队列逐行浮出，形成了富有节奏感的“舞台拉开”体验。

## 2. 现代排版特效解析

### 2.1 逐行揭示特效 (Split Line Text)
**实现方式**：
在 HTML 结构中，每一行文字都被 `<span className="split-line">` 包裹。外层设置 `overflow: hidden`。
在初始状态下：`gsap.set(..., { yPercent: 110, skewY: 6 })` 将内部的 `.split-line__inner` 推移到不可见的下方，并附加了 6 度的倾斜。
在滚动进入时，通过 staggered (交错) 动画，使每一行文字如同多米诺骨牌一般依次从底部升起并恢复正常倾角，极具力量感。

### 2.2 胶囊磁性按钮 (Magnetic Pills)
页脚的联系方式采用了现代的药丸状设计 (`.contact__btn`)，其动效同样遵循 Timeline 队列。
源码中 `tl.to('.contact__btn', { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, 0.32)` 确保了它们在主标题升起后顺滑漂浮到位。结合原生 CSS `:hover` 的补间动画，实现了高端的交互手感。
