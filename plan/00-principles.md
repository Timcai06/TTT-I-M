# 00 · 不可违背的原则

> 这些是所有改动的护栏。任何一条若被违背，停下来重新设计。
> 前半部分是已落地、长期有效的不变量（守卫在强制执行）；后半部分是
> 粒子连续体新增的 GPU 时代护栏。

## 视觉「绝不牺牲」五原则

1. **降级而非删除**
   每个昂贵效果都必须有一个「视觉等价或近似」的廉价路径，绝不直接移除。
   - grain SVG turbulence → 移动端/低 FPS 换静态预栅格 PNG（视觉接近）
   - 转场液体波 → reduced-motion 直接 immediate scroll，零着色器
   - 粒子预算 → 按设备分级，移动端减半（已实现，是范本）
   - **连续体每个形态都有非 WebGL 静态兜底**（见下方「粒子连续体不变量」）

2. **降级触发条件统一**
   所有降级走同一套判定：`prefers-reduced-motion` / `(hover:none)` /
   WebGL context 预算 / `getGLQualityProfile()` 设备分级 / 运行时低 FPS 自适应。
   不要每个组件各写一套。

3. **滚动帧内只动 transform 和 opacity**
   其它一切（`filter` / `box-shadow` / `border-radius` / `clip-path` /
   `backdrop-filter` / `mix-blend-mode`）只允许出现在**非滚动的一次性过渡**里，
   且必须在 `disable-hover` 期间被冻结。GPGPU 仿真不受此约束（它在 GPU 上跑，
   不触发 DOM 重排/重绘），但它的 canvas 合成层必须独立、不强制下方重绘。

4. **画质用「加载策略」换，不用「压缩质量」换**
   能动的是：解码时机、`fetchpriority`、`decode()` 调度、srcset 命中正确尺寸、
   粒子数随设备分级。不能动的是：源图质量、动效质感、排版层次。

5. **效果可逆**
   任何效果都能被运行时 FPS 监测降级后再恢复，不留视觉残影。
   连续体的形态切换、密度调节都必须可被 quality 降级实时改变而不崩。

## 性能不变量（Invariants）

- **mix-blend 是预算资源**：全屏 blend 最多一层（grain）。其余 blend 元素必须小面积，
  且不在滚动重绘热区。连续体粒子用 additive/normal blend 在自己的 canvas 内，不占全屏
  blend 预算。
- **每个 WebGL context 都要登记**：常驻 context 数量是硬预算。新增 GL 效果先问
  `contextRegistry.canAcquire()`。**连续体落地后，常驻 context 应收敛为 1**（见下）。
- **整站预热的边界 = landing**：`resources/manifest` 永远只覆盖 landing 这一个有界、
  策展的资产集。博客 / 作品 / UGC（无限增长）**绝不进 preload**，走懒加载 / SSR。
  *（本条被 `src/lib/resources/manifest.ts` 注释与 `loader-preload-guards.mjs` 锁定。）*
- **内容区是轻运行时**：studio 的博客/作品页**绝不** import GSAP / R3F / Lenis / three /
  preload。连续体是 landing 专属，永不外溢到 studio。
- **失败不致命**：任何 non-critical 资源失败都不得阻塞首屏 `ready`；GPGPU 初始化失败
  （WebGL2 不可用、纹理分配失败）必须静默降级到静态兜底，绝不白屏。

## 粒子连续体不变量（新增，M0 起强制）

> 这些是连续体的护栏，对应守卫见 [`05-guards-and-budgets.md`](./05-guards-and-budgets.md)。

1. **唯一持久 context**
   连续体是全站**唯一**的常驻 WebGL context。它落地时必须**吞掉** Hero 的
   ParticlePortrait（M0）与 About 的 TextParticles（M1）各自的 canvas——常驻 context
   从今天的「最多 3」降到「恒为 1」。转场期可短暂存在第 2 个（液体波若也走 GL，
   当前是 SVG，不占）。守卫：连续跳转 N 次后常驻 context 计数 == 1。

2. **每个形态都有静态兜底**
   形态注册表里每一章的粒子形态，都必须声明一个 `fallback`——即该章**现有的**非 WebGL
   视觉（Hero 幽灵照片、About 衬线正文、Contact 米白排版）。reduced-motion /
   WebGL2 不可用 / 低端档下，连续体不挂载，各章直接显示 fallback。**不允许出现
   「没有连续体就空一块」的形态。**

3. **粒子预算随设备分级，视觉身份不变**
   粒子数与 sim 纹理尺寸由 `getGLQualityProfile()` 决定（high 256²≈65k /
   mid 192²≈37k / mobile 128²≈16k / low 0→兜底）。分级只改**数量与 DPR**，
   不改形态、颜色、行为——低端档是「稀疏版同一个生命体」，不是另一种效果。

4. **颜色是 token 派生**
   粒子着色读章节色温（`chapterTheme.ts` 的当前主题），tint 必须来自 token 体系，
   不得在着色器里硬编码十六进制。亮底章节（Contact 米白）的粒子色必须保证可读性。

5. **GPGPU 成本被预算守住**
   sim 每帧成本（纹理读写次数、噪声调用）随 quality 缩放；FPS-p95 门覆盖所有形态
   的热区（Hero 静置 / About morph / Contact 水面 / 章节转场搅动各采样一段）。

6. **着色器不内联魔法**
   GLSL 走真实文件 + `#include`（`vite-plugin-glsl` + `lygia`），噪声/缓动/曲线从
   共享库引入，不在模板字符串里手抄。纯几何（Gerstner 波场、数学曲面采样）抽成
   带单测的 TS 纯函数（沿用 Frame 范式：`lib/*.ts` 纯几何 + 单测）。
