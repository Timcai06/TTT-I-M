# 技能矩阵 (Skills)

> [!NOTE]
> 本文档基于 `src/components/Skills.tsx` 真实源码编写。详细解读了动态计算的三次贝塞尔曲线（Cubic Bezier）自适应生成算法。

## 1. 响应式蛇形轨道 (Adaptive Flowing SVG)

很多现代网页拥有漂亮的背景 SVG 引导线，但一旦用户调整窗口大小，固定写的 `path` 坐标就会发生错位。`Skills.tsx` 用纯数学算法彻底解决了这一痛点。

### 1.1 动态锚点计算
每次窗口尺寸变化时，React 会读取组件的实际高度 `sY`（起点）和 `eY`（终点）：
```typescript
const P0 = { x: 0, y: sY - 120 }
const P1 = { x: viewportWidth * 0.72, y: sY + (eY - sY) * 0.3 } // 第一次右侧峰值
const P2 = { x: viewportWidth * 0.28, y: sY + (eY - sY) * 0.7 } // 第二次左侧峰值
const P3 = { x: viewportWidth, y: eY + 120 }
```

### 1.2 C1 连续的三次贝塞尔曲线插值
为了让折点看起来不生硬，代码采用了张力系数 `k = 0.38`，通过算法自动衍生出每段控制点（Control Points）：
```typescript
// 第一段 P0 -> P1 (起点水平出发，拐点垂直切入)
const cp1_0 = { x: P0.x + (P1.x - P0.x) * k, y: P0.y }
const cp2_0 = { x: P1.x, y: P1.y - (P1.y - P0.y) * k }
```
这套纯函数算法能够确保无论屏幕长宽比如何变化，SVG 生成的红线永远是平滑、对称、处处切线连续的（C1 Continuity）。

## 2. 完美的 1:1 物理同步滚动

这条红线的生长动画 `strokeDashoffset` 不是随意分配时间的，而是通过精确配置 ScrollTrigger，使其生长的末端永远“咬”在视口的中心位置：
```typescript
scrollTrigger: {
  trigger: root.current,
  start: 'top 65%', // 在板块进入视口 35% 时才开始绘制
  end: 'bottom 35%', // 调整终点，使线条垂直生长速度与页面滚动速度达到 1:1 同步
  scrub: 0.9,
}
```

## 3. 双向触发列阵动画

对于内部的文字栈列阵，使用了纯粹的 JS 交错触发：
```typescript
onEnter: () => {
  setTimeout(() => {
    row.classList.add('is-visible')
  }, index * 120)
},
onLeaveBack: () => {
  row.classList.remove('is-visible') // 向上滚动时隐藏，供下次再触发
}
```
结合 CSS 的 `.is-visible` 类名变换，这比直接使用 `gsap.from` 少了在 DOM 上频繁写入行内 `style` 的开销。
