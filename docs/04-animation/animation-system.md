# 动画系统

## 三层架构

```
Lenis (平滑滚动)
  │
  ├── lenis.on('scroll', ScrollTrigger.update)  # 滚动位置同步
  └── gsap.ticker.add(rAF)                      # 帧同步
        │
        └── GSAP (动画引擎)
              ├── Timeline 动画 (Loader / Hero intro)
              ├── ScrollTrigger 驱动 (About / Skills / Projects / Footer)
              └── Ticker 插值 (Cursor)
```

## Lenis

**文件**: `src/lib/lenis.ts`

- 实例：全局单例，通过 `getLenis()` 导出
- 参数：`duration: 1.15`，缓动函数 `1.001 - 2^(-10t)`（指数衰减近似）
- 集成：`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(lenis.raf)`
- 滞后平滑：`gsap.ticker.lagSmoothing(0)`
- 启动延迟 150ms 刷新 ScrollTrigger 确保高度稳定

## GSAP Context 模式

所有动画组件遵循的统一生命周期：

```typescript
useEffect(() => {
  const ctx = gsap.context(() => {
    // 注册动画 (gsap.to / from / fromTo)
    // 注册 ScrollTrigger
  }, rootRef)  // scope 限制在组件 DOM 内

  return () => ctx.revert()  // 卸载时完全清理
}, [])
```

## 动画分类

### 1. 时间线驱动 (Timeline)

| 组件 | 用途 |
|------|------|
| Loader | 计数进度 → 滑动退出 |
| Hero | 三段式进入动画（stagger 重叠） |

### 2. 滚动驱动 (ScrollTrigger)

| 组件 | 触发模式 | 动画类型 |
|------|----------|----------|
| Hero | scrub (滚动即变) | 视差 + 形变 |
| About | toggleActions + scrub | 文字展开 + 路径绘制 + 肖像形变 |
| Skills | scrub + toggle | SVG 曲线 + 行展开 |
| Projects | toggle | 卡片可见性 |
| Footer | onEnter | 文字展开 + 淡入 |

### 3. Ticker 驱动

| 组件 | 用途 |
|------|------|
| Cursor | deltaRatio lerp 跟随鼠标 |

## ScrollTrigger 回退控制

- `toggleActions: 'play none none reverse'`：在回滚时自动重置动画
- `onLeaveBack`：用于类名切换 (Skills / Projects)
