# Hero 组件

**文件**: `src/components/Hero.tsx`

## 职责

- 展示全屏肖像粒子系统
- 执行三段式文字进入动画
- 滚动时对粒子画布和文字施加视差与形变

## 进入动画时间线

| 阶段 | 选择器 | 效果 | 持续时间 | 触发延迟 |
|------|--------|------|----------|----------|
| 预热 | `.hero__kicker` | 上划线淡入 | 1.8s | 1.8s 后 |
| 核心 | `.split-line__inner` | 文字从下方展开 (yPercent: 110 → 0) | 2.2s | stagger 0.12s |
| 元信息 | `.hero__meta-block` | 侧边信息淡入+上移 | 1.8s | stagger 0.15s |
| 副线 | `.hero__subline > *` | 底部文字淡入+上移 | 1.8s | stagger 0.12s |

使用负值 `-=` 重叠，总时长约 2.5s。

## 滚动驱动的形变

四个独立的 GSAP 动画，`scrub: true`，从 `top top` → `bottom top`：

| 目标 | 属性变化 |
|------|----------|
| `.hero__canvas` | `yPercent: 18`（画布下移） |
| `.hero__ghost` | 透明度降至 0.05，scale 1.08，灰度+模糊 |
| `.hero__scan` | 透明度降至 0.05，yPercent 12 |
| `.hero__content` | yPercent -8，透明度降至 0（文字淡出） |

## 结构

```
section.hero
├── .hero__canvas
│   ├── img.hero__ghost          # 源照片（幽灵层，滚动时渐变为灰度）
│   ├── Canvas (ParticlePortrait) # R3F 粒子系统
│   └── .hero__scan              # 扫描线装饰
├── .hero__vignette               # 暗角遮罩
└── .container.hero__content
    ├── .hero__meta               # 侧边元信息
    ├── .hero__kicker             # 上划线
    ├── h1.hero__name             # "Tim Cai." 分两行 split-line
    └── .hero__subline            # 副标题 + scroll 提示
```
