# About 组件

**文件**: `src/components/About.tsx`

## 职责

个人自述区块，展示背景信息、技术栈和理念，配合滚动驱动动画和 SVG 路径绘制。

## 动画

| 动画 | 触发 | 效果 |
|------|------|------|
| 标题行 | `top 85%` | 四行分句从下方展开 (yPercent: 100 → 0)，stagger 0.12s |
| 段落块 | 每个 `.about__block` 独立触发 `top 90%` | y: 32 → 0, opacity: 0 → 1 |
| 统计数字 | `top 92%` | 三点数值淡入，stagger 0.15s |
| 肖像框 | `top 80%` → `top 20%` scrub | border-radius 形变 (180px → 320px)，图片缩放 |
| 技术曲线 | `top 80%` → `bottom 80%` scrub | SVG 路径从 0 绘制到完整 |

所有动画设置 `toggleActions: 'play none none reverse'`，实现双向回退。

## 内容结构

```
.about__grid  (两列布局)
├── .about__left
│   ├── h2.about__lead        # 四行标题（split-line）
│   ├── .about__content-flow
│   │   ├── .about__block--vision      # 愿景 / 背景
│   │   ├── .about__block--tech        # 技术栈（含 SVG 流动曲线 + 标签）
│   │   └── .about__block--manifesto    # 编程理念
│   └── .about__facts          # 三栏统计数字
│
└── .about__right
    └── .about__portrait-sticky
        ├── .about__portrait-frame      # 肖像框（含辉光 + 暗角 + "→ V3.0"）
        └── .about__block--philosophy   # 站点理念
```

## SVG 技术曲线

`about__block--tech` 中包含一个 40×180 SVG，绘制 C 形贝塞尔曲线。GSAP 将路径的 `strokeDashoffset` 从 `length` 动画到 0，模拟从顶部到底部的延展绘制。
