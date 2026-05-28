# Loader 组件

**文件**: `src/components/Loader.tsx`

## 职责

全屏加载遮罩，显示 000 → 100 数字计数和进度条，完成后滑动退出。

## 动画流程

```
GSAP timeline
├── target.value: 0 → 100 (duration: 1.6s, power2.inOut)
│   ├── 每帧更新：数字显示 (padStart 3 位)
│   └── 每帧更新：进度条宽度
└── onComplete: 容器 y: 0 → -100% (duration: 1.1s, expo.inOut)
    └── setDone(true) → 组件返回 null
```

## 行为

- `done` 状态：动画完成后设置 `done = true`，组件从 DOM 中移除
- 容器 `y: '-100%'` 退出，被上方内容自然覆盖
