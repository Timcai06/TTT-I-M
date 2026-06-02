# 技术栈详解

## 运行时

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.6 | UI 框架 |
| TypeScript | ~6.0.2 | 类型系统 |
| Vite | ^8.0.12 | 构建工具 + HMR |

## 动画

| 技术 | 版本 | 用途 |
|------|------|------|
| GSAP | ^3.15.0 | 核心动画引擎 |
| ScrollTrigger | GSAP 插件 | 滚动驱动动画 |
| Lenis | ^1.3.23 | 平滑滚动 + 滚轮节律 |

GSAP 负责所有 DOM 动画（文字展开、元素淡入、滚动形变），Lenis 负责滚动物理。两者通过 `lenis.on('scroll', ScrollTrigger.update)` 和 `gsap.ticker.add(rAF)` 双向同步。

## 3D / WebGL

| 技术 | 版本 | 用途 |
|------|------|------|
| Three.js | ^0.184.0 | WebGL 底层 |
| @react-three/fiber | ^9.6.1 | React 声明式 R3F |

Hero 区的粒子肖像使用自定义着色器材质 (`ShaderMaterial`) + `Points`，而非标准 Mesh。顶点着色器和片元着色器手写 GLSL。

## 样式

| 技术 | 用途 |
|------|------|
| CSS Custom Properties | 设计令牌系统 |
| CSS @import | 组件样式分片 |
| Google Fonts | Playfair Display + Inter |

无 CSS-in-JS 框架、无 Tailwind — 所有样式均为手写 CSS。

## 数据

作品数据由 `src/data/projects.ts` 中的 TypeScript 接口 + 常量数组提供。无数据库、无运行时数据获取。
