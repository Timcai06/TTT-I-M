# 05 · 测试与守卫

> 目标：让性能预算与架构约束变成 CI/本地可稳定验证的回归网，防止未来重新引入昂贵 CSS、
> 重复 ScrollTrigger、preload 外溢、context 泄漏。

## 现有资产（已就绪，复用）

- `tests/build/chunk-guards.mjs` —— chunk 存在性
- `tests/build/chapter-state-guards.mjs`
- `tests/build/frame-architecture-guards.mjs`
- `tests/build/loader-preload-guards.mjs`
- `tests/activeChapter.test.ts`（vitest）
- `tests/e2e/frame.spec.ts`（Playwright）
- 开发期 `src/components/PerfHud.tsx`（FPS/long-task，prod 已 tree-shake）

## Build Guard 扩展

| 守卫 | 断言 | 防回归 |
|---|---|---|
| chunk 体积预算 | react-vendor / gsap-vendor / three-vendor / index 各 gzip ≤ 阈值 | 包膨胀（02·A10） |
| manifest scope | frame/projects 图均为 `deferred`，hero/字体/Pretext/about 为 `critical` | preload 外溢 + 黑屏（02·A1） |
| LCP preload | index.html 含 hero 首像 `rel=preload fetchpriority=high` | LCP 退化（02·A9） |
| 内容区隔离（平台期） | studio 产物不含 gsap/three/lenis | 包污染（03） |
| 组件不直 import data | 组件层 `from '.*data/'` 命中数 = 0 | 内容层解耦回归（04） |

## Playwright 性能门（扩 `tests/e2e/`）

用 `page.context().tracing` + CDP Performance / 注入 PerformanceObserver 采集：

| 指标 | 预算（建议起点，按真机调） | 场景 |
|---|---|---|
| 首屏 long task 总时长 | < 阈值 | 冷加载 → intro 退场 |
| LCP | < 2.5s（本地基线另算） | 首屏 |
| CLS | < 0.05 | 首屏 + 章节跳转 |
| INP | < 200ms | 章节跳转交互 |
| FPS p95 帧时间 | < 20ms | frame 横滚 / about 粒子 morph / 章节转场 三段各采样 |
| JS heap / context | 连续跳转 10 次后回基线 | 防 ChapterTransition context 泄漏 |

### FPS 采样法

在三段热区各跑一段 `requestAnimationFrame` 计帧，断言 p95 帧时间达标。
PerfHud 的逻辑可抽成可被 e2e 调用的探针。

### 视觉不回归

- canvas 像素采样：about 粒子成形后非空、hero 粒子非空。
- 关键帧截图对比（转场前后、各章节首帧）。
- 已有 `trackTransform !== 'none'` 检查保留并扩展。

### 降级路径 e2e

- `prefers-reduced-motion: reduce` 下：断言 fallback serif/static 出现，页面仍可滚到底。
- 模拟 WebGL 失败（注入 context 创建失败）：断言不崩、有降级。
- 故意 404 一张 frame 图：断言 loader 仍退场（02·A1 回归）。

## 本地稳定化（重要）

- 性能验证用**真实 Chromium（headed）+ trace**，
  **不依赖 Claude Preview**（已知该项目 Preview server 不可靠：1px viewport、RAF 节流、
  CSS @import HMR 服务陈旧——loader 黑屏卡住、scroll 动画不前进）。
- 正确性优先 `tsc` / `build` / `eslint`（type-aware）。
- PerfHud 作为开发期肉眼回路保留。

## CI 编排建议

```
npm run typecheck
npm run lint
npm run build
npm run test:build         # 现有 4 个 build guard + 新增体积/manifest/LCP 守卫
npm run test               # vitest
npm run test:e2e           # frame + 新增性能门 + 降级路径
```

性能门阈值先以「当前 main 实测 + 余量」设定，避免一上来就红；逐步收紧。
