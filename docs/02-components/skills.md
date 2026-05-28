# Skills 组件

**文件**: `src/components/Skills.tsx`

## 职责

以蛇形排版展示六类技术栈，核心视觉是一条贯穿全区的自适应 SVG 流动曲线。

## 数据

```typescript
interface Row {
  index: string    // "/01" ~ "/06"
  name: string     // "Frontend", "Motion · 3D"...
  tags: string[]   // ["React 19", "Next.js 16"...]
}
```

## SVG 蛇形曲线

### 特点

- 全响应式：`useEffect` 监听 `resize`，用 `getBoundingClientRect()` 测量标题和最后一行的位置，动态计算四个控制点
- 三段式三次贝塞尔曲线：`P0 → P1 → P2 → P3`，呈现左→右→左→右的蛇形走势
- C1 连续：在拐点处控制点垂直对齐，确保曲率平滑
- 两层路径：80px 宽红色引导轨道 + active 流动高亮

### 路径构造

```
P0 (0, title.y - 120)
  → P1 (viewport * 0.72, mid * 0.3)     // 第一次右拐
  → P2 (viewport * 0.28, mid * 0.7)     // 第二次左拐
  → P3 (viewport, lastRow.y + 120)       // 出口
```

### 流动动画

GSAP 将 `strokeDashoffset` 从 `pathLength` 动画到 0，`scrub: 0.9`，随滚动从左上角逐渐绘制到右下角。

## 行展开

每行 `.skill-row` 通过 ScrollTrigger 添加 `is-visible` 类（CSS 控制最终显示），stagger 120ms 延迟。`onLeaveBack` 移除类，实现双向控制。
