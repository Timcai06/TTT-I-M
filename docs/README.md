# Portfolio — Tim Cai

> 一个以 WebGL 粒子肖像为视觉锚点的个人作品集站点。React + TypeScript + Vite + GSAP + Three.js (R3F)。

---

## 文档导航

```
docs/
├── README.md                        # ← 你在这里
├── 01-architecture/
│   ├── overview.md                  # 项目架构总览（目录结构、数据流、构建管线）
│   └── tech-stack.md                # 技术栈逐项详解
├── 02-components/
│   ├── overview.md                  # 组件层次结构与职责矩阵
│   ├── hero.md                      # Hero 区：粒子肖像 + 进入动画 + scroll-driven 形变
│   ├── particle-portrait.md         # GLSL 着色器粒子系统（核心视觉）
│   ├── about.md                     # 自述区：滚动驱动排版 + 技术栈流动曲线
│   ├── skills.md                    # 技能区：响应式 SVG 蛇形曲线
│   ├── projects.md                  # 作品展示区：数据驱动卡片
│   ├── nav.md                       # 顶部导航：IntersectionObserver 活性追踪
│   ├── footer.md                    # 页脚：CTA + 联系信息
│   ├── loader.md                    # 启动加载器：进度条 → 滑动退出
│   ├── cursor.md                    # 自定义光标：GSAP ticker 滞后跟随
│   └── scroll-indicator.md          # 侧边滚动指示器：进度 + 章节名
├── 03-styles/
│   └── design-system.md             # 设计令牌、字体、暗色主题、排版系统
├── 04-animation/
│   └── animation-system.md          # Lenis + GSAP + ScrollTrigger 动画编排
├── 05-projects/
│   └── project-data.md              # 作品数据模型与六个项目的完整内容
└── 06-scripts/
    └── setup-assets.md              # 构建前置脚本：肖像资产复制
```

---

## 快速指引

| 目标 | 入口 |
|------|------|
| 理解项目全貌 | `01-architecture/overview.md` |
| 理解核心视觉 | `02-components/particle-portrait.md` |
| 理解动画体系 | `04-animation/animation-system.md` |
| 获取作品数据 | `05-projects/project-data.md` |
