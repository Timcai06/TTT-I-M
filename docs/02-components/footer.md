# Footer 组件

**文件**: `src/components/Footer.tsx`

## 职责

作品集页脚，包含 CTA 标题和联系信息。

## 动画

| 动画 | 触发 | 效果 |
|------|------|------|
| CTA 标题 | `top 80%` | 三行 split-line 展开 (yPercent: 100 → 0)，stagger 0.12s |
| 底部元信息 | `top 90%` | 三项 fade in + 上移，stagger 0.15s |

## 结构

```
footer.footer
├── h2.footer__cta             # "Let's build" / "something" / "that lasts."
│   └── 第三行包含 mailto 链接
└── .footer__meta
    ├── © 2026 · Tim Cai · ShangHai
    ├── GitHub ↗ / Email ↗ / ↑ top
    └── Site · GSAP · R3F · GLSL · hand-coded
```
