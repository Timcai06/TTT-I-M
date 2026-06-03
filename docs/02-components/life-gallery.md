# 人生画廊 (Life Gallery)

> [!NOTE]
> 本文档基于 `src/components/LifeGallery.tsx` 真实源码编写。这是本项目中最具电影叙事感，且运用了 GSAP Flip 插件的高阶组件。

## 1. 核心视觉机制：从 Bento 到全屏 (Flip Animation)

`LifeGallery` 打破了常规的向下滚动浏览模式，通过 GSAP `Flip` 插件，将分散的图片网格（Bento Grid）在滚动过程中无缝变形（Morph）为铺满全屏的背景墙。

### 1.1 状态记录与反转 (FLIP 原理)
- **F**irst: 记录所有 `.gallery__item` 的初始几何属性（通过 `Flip.getState(items)`）。
- **L**ast: 瞬间为其加上 `.gallery--final` 类名，让其充满全屏，并计算最终状态。
- **I**nvert: 将其位置反相，使其看起来还在原位。
- **P**lay: 通过时间轴 `tl.add(flip)` 播放补间动画。

### 1.2 时间轴编排细节
整套画廊动效被严格地封装在一个绑定了 `.gallery-wrap` 的 ScrollTrigger 时间轴中，视口被强制锁定 (`pin: galleryWrap`) 长达 `1000vh` 的滚动距离（`'+=' + window.innerHeight * 10`），以便从容播放电影级叙事：

1. **磁性吸附**：相册最开始有一个从 `scale: 1.045` 缩放到 `1` 的轻微吸附感。
2. **变形展开**：执行 `Flip` 展开。
3. **沉浸式滤镜**：随着文字准备浮现，底层图片通过 `filter` 从清晰变为 `brightness(0.18) ... blur(8px)`，为阅读让出视觉空间。
4. **文案交错**：3 段介绍人生的段落依次漂浮上升，中间插入供用户阅读的静止时间。

## 2. 工程防御与自愈 (Self-Healing)

### 2.1 CSS 变形遗留问题 (`yPercent` vs `y`)
在源码中有一段针对文字隐藏的极客处理：
```typescript
gsap.set(allLines, { yPercent: 110, y: 0, opacity: 0 })
```
> [!TIP]
> **底层博弈**：强制声明 `y: 0` 是因为 GSAP 会读取浏览器当前的 Transform 矩阵。如果在热更新或屏幕缩放中，样式表曾产生过细微的 TranslateY 基准，GSAP 就会把它作为 `y` 吃进去。这会导致我们只想基于本身高度位移（`yPercent: 110`）的元素，最终被推移到超出 `overflow: hidden` 的遮罩范围。强制 `y: 0` 保障了动画绝对干净的坐标系。

### 2.2 响应式重置 (Resize Handler)
当浏览器窗口发生改变时，原本计算好的 Flip 矩阵全部失效。
组件通过 `window.addEventListener('resize', createFlip)` 监听屏幕变化，在每次改变时，调用 `ctxRef.current?.revert()` 完全抹除旧的 ScrollTrigger 和 Flip，并重新进行新尺寸下的状态记录与绑定。这确保了在旋转手机屏幕或拖拽窗口时，全屏网格不会发生任何错乱。
