# 02 · 里程碑执行计划

> 本期范围：**M0 / M1 / M2 / M3 / M4**。当前代码已推进到 M0-M4 结构完成，视觉脉冲类打磨项另列后续。
> 每个里程碑独立可上线、过全套门、site 始终可发布。
> 勾选框直接当 todo 用。

---

## M0 · 脊柱（持久 canvas + GPGPU + 后续章节连续体）

> 地基。做完后 Index/Hero 的既有肖像粒子主体**不回退、不被替换**；App 级连续体先在
> 后续章节作为低亮星团/光场出现，并使用同一套章节主题色平滑过渡。之后的形态都往这根
> 脊柱上挂。旧版“移除 ParticlePortrait、Hero 完全迁入 Continuum”改为后续可选迁移，
> 只有在视觉身份能 1:1 保住时再执行。

### 步骤

- [x] **环境**（详见 [03](./03-continuum-tooling.md)）：装 `vite-plugin-glsl`、vendore `lygia`、
  确认 R3F 9 下 GPUComputationRenderer 的引入路径；配 GLSL `#include`。
- [x] **`continuum/simulation.ts`**：GPGPU ping-pong（position/velocity FBO），
  半隐式欧拉 + 阻尼 + curl 湍流；uniform：`uMorph/uStiffness/uTurbulence/uDamping/uTime/uTint`。
- [x] **shaders/**：`sim-position.glsl`、`sim-velocity.glsl`、`render.vert/.frag`，
  噪声/曲线 `#include` lygia。
- [x] **`continuumQuality.ts`**：扩展 `getGLQualityProfile()` 加 `continuum` 字段
  （particleTexSize / pointSize / noiseOctaves，4 档）。
- [x] **`forms/registry.ts` + `forms/portrait.ts`**：肖像采样器从 ParticlePortrait 抽出
  （亮度阈值发射点 + z 微位移保景深）；注册表先只有 `portrait` 一项 + 其 fallback=幽灵照片。
- [x] **`ParticleContinuum.tsx`**：App 级 fixed canvas；reduced-motion / particleTexSize===0
  时不挂载；`contextRegistry.acquire()`。
- [x] **保留 Hero 主体**：Index 继续使用已确认的 `<ParticlePortrait>` 与背景肖像；
  Continuum 在 hero 阶段视觉 opacity=0，避免额外红色星团破坏首屏。
- [x] **`landingScrollNarrative.ts` + `useLandingScrollNarrative.ts`**：全 landing 的滚动叙事层；
  从 `chapterScrollMetrics` 的单一 rect 快照派生 activeId / progress fills / from→to blend / theme mix。
- [x] **`useContinuumScroll.ts`** 骨架：消费 landing narrative → opacity/tint/behavior，
  输出 from/to form 与 morph；颜色读取混合后的 `theme.cover`，与章节转场同源。
- [x] **丝滑颜色门**：背景 `--bg` 由 landing narrative 跟随滚轮 scrub；Continuum 的
  tint/opacity 在 `useFrame` 中继续插值，不允许章节切换时直接跳色。
- [x] **全站像素进度条**：右侧 rail 用真实滚动像素和章节 top/bottom 边界计算填充；
  不再用视口中心线近似进度，且多个消费者不能覆盖 `chapterScrollMetrics` 的测量 id。
- [x] **context 策略门**（见 [05](./05-guards-and-budgets.md)）：M0 当前允许 Hero 原肖像
  canvas + 后续章节 Continuum 并存；单 context 合并作为“Hero 视觉迁移完成后”的 M0b/M5
  候选，不以牺牲已确认首屏视觉为代价。

### 验收

- Hero 肖像保留当前已确认主体，不叠加红色星团；后续章节星团跟随对应章节主题色。
- reduced-motion / 无 WebGL2 下 Hero 显示现有幽灵照片，零回归。
- 右侧进度条是全站像素级丝滑指示器，章节段填充与真实滚动距离对应。
- 章节切换时 Continuum tint/opacity 平滑过渡，不突变。
- typecheck / lint / build / 全部 build guard 绿。

### 风险

- **持久 canvas vs 章节懒加载协调**：canvas 在 App 级常驻，章节进出不卸载它——这是
  本里程碑要啃的硬骨头。先用 hero 单形态把生命周期跑稳，再加形态。
- **肖像视觉身份**：位移平面 → 点云的观感差异。M0 接受「读得出是肖像 + 粒子质感在」，
  不追逐像素一致；若观感掉太多，可在采样里保留亮度→z 位移找回景深。
- **R3F 9 + GPUComputationRenderer**：引入路径与 React 19 并发模式的兼容性需先验证
  （见 03 的「依赖验证」）。

---

## M1 · About 解体 + 星尘 morph

> 第一个形态变化，也是连续体「会变形」的首次证明。

### 步骤

- [x] **`forms/disintegrate.ts`**：刚度→0、湍流拉满的参数集；Hero→About 滚动时
  肖像点云溃散为 curl-noise 流场。
- [x] **退役 TextParticles canvas**：About 不再挂载独立 TextParticles；Continuum 用 `disintegrate`
  程序化目标承接粒子叙事，正文可读性由 DOM 排版兜底。
- [x] **`forms/stardust.ts`**：Life/Frame 的稀薄星尘——密度压到背景级，照片是主角
  （00 原则：克制即设计）。
- [x] **Skills 不介入**：粒子在此章保持星尘/低存在感，把舞台让给红色蛇形线。
- [x] **morph 编排**：`useContinuumScroll` 处理 hero→about→life→frame→skills 的形态序列
  与混合，per-particle seed 错峰。
- [x] **色温联动**：About 暖纸 tint，随 `landingScrollNarrative.theme` 走。

### 验收

- Hero→About 平滑 morph，肖像可信地溃散为语言感尘埃；About 正文仍由 DOM 保持可读。
- Life/Frame 粒子不抢照片（密度肉眼几乎不可见，但滚动时有微动）。
- 移除 TextParticles 后 About 不再增加独立粒子 canvas；常驻 context 不增长。
- reduced-motion 下 About 显示现有衬线正文兜底，零回归。
- 全套门绿。

### 风险

- **文字可读性**：粒子数在 mobile 档（16k）下聚成中文 manifesto 可能糊——需按字数/字号
  调密度，或低档下文字段回退到 DOM 文本（fallback 已有）。
- **About 语义边界**：粒子负责氛围与解体方向，正文可读性仍由 DOM 负责，避免把中文文本可读性压到低端粒子预算上。

---

## M2 · Work 数学曲面

> 已落地为低存在感背景轨迹，不替代项目图片。

- [x] `forms/mathSurface.ts` 声明 Work 形态行为参数、fallback 与 blendMode。
- [x] `forms/proceduralTargets.ts` 生成确定性数学曲面目标纹理，不依赖 DOM 图片。
- [x] Work 映射到 `mathSurface`，透明度保持克制，项目截图和文字仍是主角。
- [x] 单测验证点位有限、稳定、刷新不随机洗牌。

---

## M3 · Contact Gerstner 水面 + 终场

> 你提到的「three.js 写游戏水面」的正确落点：游戏级 Gerstner 波，作为全站终场。

### 步骤

- [x] **`forms/gerstner.ts` + `forms/proceduralTargets.ts`**：生成确定性水面目标纹理，
  行为参数与 fallback/blendMode 写入形态注册表。
- [x] **水面目标**：粒子铺成网格并叠加多波起伏，作为 Contact 的低透明余波。
- [ ] **终场散点**：暂缓到后续视觉打磨；当前 M3 只收口水面形态与亮底可读性。
- [x] **亮底可读性**：Contact 是全站唯一米白章节——粒子色必须在亮底可读（暖/深色调，
  normal blend，非 additive）。
- [x] **色温联动**：Contact tint。

### 验收

- 水面起伏自然（三波叠加有真实海面感，非正弦单波）；米白底上粒子清晰可读。
- footer 区域内容可读，水面只做低存在感余波，不抢 CTA。
- Gerstner 目标纹理单测绿；reduced-motion 下 Contact 显示现有排版兜底。
- 全套门绿。

### 风险

- **亮底粒子**：连续体此前都在暗底，亮底调色是新课题；可能需 per-form 的额外描边/阴影
  让粒子在米白上立得住。
- **水面存在感**：亮底区域优先保证 CTA 与联系方式可读；水面形态宁可淡，不可抢内容。

---

## M4 · 打磨 + 硬化

> 把连续体从「能跑」推到「奖项级稳」。

### 步骤

- [x] **转场纪律**：`stage !== live` 或不可见时暂停 Continuum；转场搅动脉冲暂缓，避免和 ChapterTransition 抢帧。
- [x] **密度调音**：逐章微调 density/size/turbulence，确保 Frame/Life 让位照片、
  Hero/Contact 粒子当主角、过渡区 morph 节奏舒服。
- [x] **性能顾问门扩展**：FPS-p95 采样覆盖 About morph / Work 曲面 / Contact 水面；
  连续章节跳转由 context e2e 守住“不增长”。
- [x] **GPU 预算守卫**（见 [05](./05-guards-and-budgets.md)）：粒子数按档上限、sim 纹理
  尺寸上限、context 不增长、debug 面板不进 prod bundle。
- [x] **降级路径复核**：沿用 shouldMountContinuum / reduced-motion / WebGL fail gates；
  high/mid/mobile 真机阈值收紧留给 RUM 和设备实测。

### 验收

- Continuum 可见段 FPS-p95 已进入顾问采样；连续 10 次跳转后 canvas/context 不增长。
- reduced-motion / WebGL fail 兜底沿用既有 gates，无白屏。
- 阻塞 gates 绿；新增 GPU 守卫并入 `test:build` 与 CI。

### 风险

- **FPS 长尾**：morph 高峰（大量粒子同时变向）是帧时间最坏点；若 p95 超标，降 sim
  纹理尺寸或分帧更新目标。
- **跨设备一致性**：移动端 GPU 差异大；mobile 档要在真机（非模拟器）验。

---

## 里程碑依赖与节奏

```
M0（脊柱）
 └─▶ M1（双目标 morph + About/Frame 星尘）
      └─▶ M2（Work 数学曲面）
      └─▶ M3（Contact 水面）
           └─▶ M4（运行纪律 + GPU/性能守卫）
```

- M0 是唯一强前置；M1 提供双目标 morph 后，M2/M3 只是新增形态。
- 每个里程碑结束都过全套门，site 始终可发布。
