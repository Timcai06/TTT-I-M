# Cursor 组件

**文件**: `src/components/Cursor.tsx`

## 职责

自定义圆形光标替代原生指针，使用 GSAP ticker 实现滞后跟随。

## 实现

- 触摸设备跳过：`window.matchMedia('(hover: none)').matches`
- 初始状态：`opacity: 0`，居中定位
- 鼠标移动：目标坐标 `target` 随 `mousemove` 更新
- 每帧物理：`lerp(target, pos, speed=0.22) * dt` → 基于帧率的平滑跟随
- 交互元素：为所有 `a`、`button`、`[data-cursor="hover"]` 注册 `mouseenter/mouseleave` → 切换 `.is-hover` 类

## 生命周期

```
useEffect
├── 初始化位置 / 透明度 / 标记
├── 注册 mousemove 监听
├── 将 ticker 加入 GSAP ticker
├── requestAnimationFrame 等待子组件挂载 → updateInteractives
└── 清理：移除监听、ticker、交互事件
```
