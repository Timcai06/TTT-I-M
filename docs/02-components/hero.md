# 首屏视觉系统 (Hero Section)

> [!NOTE]
> 本文档基于 `src/components/Hero.tsx` 真实源码编写。Hero 是全站唯一一个急切渲染 (Eager Render) 的组件。

## 1. 混合渲染与悬念呈现

Hero 区域负责给用户第一印象。它混搭了传统的 DOM 排版与异步的 WebGL 系统。
```tsx
<div className="hero__canvas">
  <img className="hero__ghost" src="/portrait/tim.jpg" alt="" aria-hidden="true" />
  <Suspense fallback={null}>
    <ParticlePortrait />
  </Suspense>
  <div className="hero__scan" aria-hidden="true" />
</div>
```
> [!TIP]
> **为什么背后要有一张 `.hero__ghost` 图片？**
> `ParticlePortrait` 是懒加载且通过 WebGL 渲染的，首屏会有几十到几百毫秒的白屏空白期。背后的 `img` 作为占位符，不仅填补了这段时间，还在后续粒子生成后，透过 WebGL 的 `alpha` 混合，赋予了整个场景深远的纵深感和暗角质感。

## 2. 开场动画时序 (Intro Orchestration)

Hero 的文字入场并不是简单的 `useEffect` 自动播放，而是受到了全站加载器 (`Loader.tsx`) 的控制。

### 2.1 拦截与解冻
```typescript
const tl = gsap.timeline({ paused: true })

cancelIntroExit = onIntroExit(() => {
  if (tl.paused()) void tl.play()
})
```
这保证了只有当全屏黑色的 Loader 完全褪去、粒子准备好呼吸时，巨大的 `Tim Cai.` 和自我介绍才会行云流水地进入视口。

## 3. 滚动视差与性能平衡

在 Hero 区域往下滚时，我们为背景和前景分别赋予了不同的速度（Scrub）。

**核心性能决断：**
```typescript
gsap.to('.hero__ghost', {
  opacity: 0.05,
  scale: 1.08,
  // ... scrub
})
```
> [!IMPORTANT]
> **注释中隐藏的架构权衡**：
> 源码特别标注了 `// NOTE: only transform/opacity are scrubbed here. Animating filter (esp. blur) on scrub forced a full-frame repaint...`。
> 之前可能尝试过通过滚动增加背景模糊（`filter: blur()`），但这导致了浏览器在每一次滚轮触发时强制发生全屏重绘，FPS 暴跌。最终改为只操作 `opacity` 和 `scale`（被 GPU 硬件加速的属性），彻底杜绝了性能瓶颈。
