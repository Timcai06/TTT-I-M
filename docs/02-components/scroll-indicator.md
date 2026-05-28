# ScrollIndicator 组件

**文件**: `src/components/ScrollIndicator.tsx`

## 职责

右侧浮动指示器，显示当前章节名称和全局滚动进度。

## 实现

```typescript
// 全局滚动进度
ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => setScrollPercent(self.progress),
})

// 章节切换
ScrollTrigger.create({
  trigger: `#${sec.id}`,
  start: 'top 50%',
  end: 'bottom 50%',
  onToggle: (self) => { if (self.isActive) setActiveSection(sec) },
})
```

## 结构

```
.scroll-indicator
├── .scroll-indicator__label
│   ├── .scroll-indicator__index    # "01" ~ "05"
│   ├── .scroll-indicator__divider  # "//"
│   └── .scroll-indicator__name     # "HOME" / "ABOUT" / ...
└── .scroll-indicator__bar
    └── .scroll-indicator__fill     # height = scrollPercent * 100%
```
