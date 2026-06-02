# 项目架构总览

## 目录结构

```
portfolio/
├── index.html               # Vite 入口 HTML
├── vite.config.ts           # Vite 配置（React 插件）
├── tsconfig.json            # TypeScript 项目引用
├── tsconfig.app.json        # App 编译配置
├── tsconfig.node.json       # Node 端编译配置
├── package.json             # 依赖与脚本
├── eslint.config.js         # ESLint flat config
│
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── robots.txt
│   ├── portrait/
│   │   ├── tim.jpg          # 粒子肖像源图（setup-assets 复制而来）
│   │   └── about_me.jpg     # About 区肖像
│   ├── life/                # 生活图片区 WebP
│   ├── frame/
│   │   ├── buildings/       # Frame / Building 子主题 WebP
│   │   ├── cuisine/         # Frame / Cuisine 子主题 WebP
│   │   └── scenery/         # Frame / Scenery 子主题 WebP
│   └── projects/            # 作品展示图 WebP
│
├── scripts/
│   └── setup-assets.mjs     # 构建前置脚本
│
└── src/
    ├── main.tsx             # ReactDOM.createRoot 入口
    ├── App.tsx              # 根组件：组合所有章节
    │
    ├── lib/
    │   └── lenis.ts         # Lenis 实例 + GSAP 集成
    │
    ├── data/
    │   └── projects.ts      # 作品数据（Project 接口 + 数组）
    │
    ├── components/
    │   ├── Loader.tsx        # 启动加载器
    │   ├── Cursor.tsx        # 自定义光标
    │   ├── Nav.tsx           # 顶部导航
    │   ├── ScrollIndicator.tsx # 侧边滚动指示器
    │   ├── Hero.tsx          # 首页英雄区（粒子肖像 + 文字动画）
    │   ├── ParticlePortrait.tsx # GLSL 粒子系统
    │   ├── About.tsx         # 自述区
    │   ├── Skills.tsx        # 技术栈区
    │   ├── Projects.tsx      # 作品展示区
    │   └── Footer.tsx        # 页脚
    │
    └── styles/
        ├── global.css        # 全局样式、CSS 变量、重置
        ├── app.css           # 组件样式导入枢纽
        └── components/
            ├── loader.css
            ├── cursor.css
            ├── nav.css
            ├── scroll-indicator.css
            ├── hero.css
            ├── about.css
            ├── skills.css
            ├── projects.css
            └── footer.css
```

## 数据流

```
src/data/projects.ts  ──import──▶  src/components/Projects.tsx  ──render──▶  DOM
                                        │
                                        └── 从 data-accent 属性注入 CSS 变量
```

- 作品数据脱离组件，集中管理于 `src/data/projects.ts`
- `src/data/frames.ts` 将 Frame 视觉档案组织为 Building、Cuisine、Scenery 三个子主题，并存储 cluster 布局、图片槽位、方向和 caption 元数据。
- 每个组件内部持有自己的 GSAP `context()`，挂载时注册动画，卸载时 `ctx.revert()`
- 组件间通过 DOM 类名（非 props）通信，动画系统依赖 ScrollTrigger 位置

## 构建管线

```
npm run dev / build
        │
        ▼
scripts/setup-assets.mjs    # 复制肖像，并将 Frame 子主题源图编码为 public/frame/* WebP
        │
        ▼
Vite dev server / build     # tsc + vite build
```

## 依赖关系

```
App.tsx
├── useLenis()          # lenis.ts
├── Loader              # 无依赖
├── Cursor              # 无依赖
├── ScrollIndicator     # 无依赖
├── Nav                 # lenis.ts（scrollTo）
├── Hero
│   └── ParticlePortrait
│       ├── @react-three/fiber
│       └── three
├── About               # 无子组件
├── Skills              # 无子组件
├── Projects
│   └── projects.ts     # 数据
└── Footer              # 无子组件
```

跨组件共享的滚动模块包括 `lenis.ts` 与 `chapterScroll.ts`：`lenis.ts` 持有 Lenis 实例，`chapterScroll.ts` 统一处理章节滚动与 hash 更新。
