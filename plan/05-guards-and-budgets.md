# 05 · 守卫与预算

> 让连续体的性能预算与架构约束变成 CI/本地可稳定验证的回归网。
> 现有守卫继续有效；本文新增 GPU 时代的门。

## 现有守卫（已就绪，复用）

### Build guards（`npm run test:build`，8 个 landing + platform）

| 守卫 | 断言 |
|---|---|
| `chunk-guards.mjs` | chunk 存在 + 每包 gzip 上限 + 总量 ≤460KB |
| `chapter-state-guards.mjs` | 单一章节状态源；转场层契约（wave-lead/main、waveBandPath、无 shutter/aura）；典型化事件总线（无 CustomEvent） |
| `frame-architecture-guards.mjs` | Frame 组合 / 运行时 hook / slot DOM 边界分离 |
| `loader-preload-guards.mjs` | 分层预热双向契约（不回退全量门控、不砍后台拉满） |
| `content-layer-guards.mjs` | 组件零 `data/*` 直连 + repository/schema 契约 |
| `deferred-image-budget-guards.mjs` | 延迟图片字节预算（23.6/26 MiB） |
| `platform-guards.mjs` | 多 zone 路由 / token 隔离 / studio 不含 GSAP/R3F/three |
| `continuum-gpu-guards.mjs` | shader 冒烟 / 双目标 morph uniform / GPU 纹理预算 |

### 单测（`npm run test:unit`，`node:test`）

`loaderTiming` / `skillsFlowPath` / `waveFrontPath` / `activeChapter` 等纯函数——
**Gerstner、数学曲面已加入此列**（纯几何 + 单测，沿用 Frame 范式）。

### e2e（Playwright）

- **gates（CI 阻塞）**：`degradation`（reduced-motion / WebGL 失败 / 404 图）、
  `chrome-ui`、`hero-pretext`、`continuum-context`。
- **顾问（全量）**：`frame`、`performance`（INP < 200ms、FPS-p95 帧时间）、scroll。

## 新增：GPU 时代的门

> 对应 [00 原则·粒子连续体不变量](./00-principles.md)。随对应里程碑落地。

| 守卫 | 类型 | 断言 | 防回归 | 里程碑 |
|---|---|---|---|---|
| **单 context 门** | e2e | 连续跳转 N 次后 WebGL canvas/context 数量不增长（当前 Hero+Continuum 预算 ≤2） | context 泄漏 / 多场并存（关掉积压的泄漏门） | M0 |
| **粒子预算门** | build | `continuumQuality` 各档 particleTexSize ≤ 上限（256²）、随档单调递减 | 粒子数失控 / 移动端不缩 | M4 |
| **GPU 纹理预算** | build/e2e | sim 纹理总字节（position+velocity+target，按最高档）≤ 预算 | GPU 内存膨胀 | M4 |
| **debug 不进 prod** | build（扩 chunk-guards） | prod bundle 不含 `leva`/dev 调参面板 | 开发期工具泄进生产 | M0 |
| **形态 fallback 完备** | build | `forms/registry.ts` 每个 FormDescriptor 都声明 `fallback` | 出现「无连续体即空一块」的形态（00·不变量2） | M1 |
| **着色器编译冒烟** | build | 静态 shader 冒烟检查所有 `.glsl`/`.vert`/`.frag`，并锁双目标 morph uniforms；headless WebGL2 真编译待工具链补齐 | 语法错进 main | M0 |
| **FPS-p95 全形态** | e2e（扩 performance） | Hero 静置 / About morph / Contact 水面 / 转场搅动 四段 p95 帧时间达标 | 形态级帧率退化 | M4 |

### FPS 采样法（沿用现有 performance.spec 思路）

四段热区各跑一段 `requestAnimationFrame` 计帧，断言 p95 帧时间达标。现有
`performance.spec.ts` 的 FPS-p95 探针直接扩到连续体的四段。

### 视觉不回归

- canvas 像素采样：各形态成形后非空（肖像非空、水面非空）。
- 关键帧截图：Hero 静置、About morph 中、Contact 水面、各章首帧——用真实 Chromium 抓。
- M0 专项：Hero 迁移前后「视觉身份一致」（人工 QA + 截图，不追像素级）。

### 降级路径 e2e（扩 `degradation.spec.ts`）

- reduced-motion：连续体不挂载，各章静态兜底出现，页面可滚到底。
- 模拟 WebGL2 失败（注入 context 创建失败）：不崩、走兜底、无白屏。
- 低端档（强制 `particleTexSize===0`）：兜底视觉成立。

## 本地稳定化（重要，沿用）

- 性能验证用**真实 Chromium（headed）+ trace**，**不依赖 Claude Preview**
  （该项目 Preview 不可靠：1px viewport、RAF 节流、HMR 陈旧）。
- 正确性优先 `tsc` / `build` / `eslint`（type-aware）。
- 开发期肉眼回路：`PerfHud`（FPS/long-task）+ leva 调参面板（仅 dev）。

## CI 编排（在现有基础上扩）

```
npm run typecheck
npm run lint
npm run test:unit          # + Gerstner / 数学曲面纯函数
npm run build
npm run test:build         # landing guards + platform guard + GPU 预算/fallback/shader 冒烟
npm run test:e2e:gates     # degradation + 单 context 门（阻塞）
npm run test:e2e           # 顾问全量 + FPS-p95 四形态
```

新增门阈值先以「当前 main 实测 + 余量」设定，逐步收紧——避免一上来就红。
