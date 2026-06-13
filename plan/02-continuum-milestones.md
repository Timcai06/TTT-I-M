# 02 · 里程碑执行计划

> 本期范围：**M0 / M1 / M3 / M4**。M2（Work 数学曲面）显式延后，架构留插槽。
> 每个里程碑独立可上线、过全套门、site 始终可发布。
> 勾选框直接当 todo 用。

---

## M0 · 脊柱（持久 canvas + GPGPU + 肖像迁移）

> 地基。做完后全站表现与现在**无差异**（这就是验收线），但底下已是一个可变形的
> 持久粒子系统。最难的一步——之后的形态都是往这根脊柱上挂。

### 步骤

- [ ] **环境**（详见 [03](./03-continuum-tooling.md)）：装 `vite-plugin-glsl`、vendore `lygia`、
  确认 R3F 9 下 GPUComputationRenderer 的引入路径；配 GLSL `#include`。
- [ ] **`continuum/simulation.ts`**：GPGPU ping-pong（position/velocity FBO），
  半隐式欧拉 + 阻尼 + curl 湍流；uniform：`uMorph/uStiffness/uTurbulence/uDamping/uTime/uTint`。
- [ ] **shaders/**：`sim-position.glsl`、`sim-velocity.glsl`、`render.vert/.frag`，
  噪声/曲线 `#include` lygia。
- [ ] **`continuumQuality.ts`**：扩展 `getGLQualityProfile()` 加 `continuum` 字段
  （particleTexSize / pointSize / noiseOctaves，4 档）。
- [ ] **`forms/registry.ts` + `forms/portrait.ts`**：肖像采样器从 ParticlePortrait 抽出
  （亮度阈值发射点 + z 微位移保景深）；注册表先只有 `portrait` 一项 + 其 fallback=幽灵照片。
- [ ] **`ParticleContinuum.tsx`**：App 级 fixed canvas；reduced-motion / particleTexSize===0
  时不挂载；`contextRegistry.acquire()`。
- [ ] **迁移 Hero**：移除 `<ParticlePortrait>` 自带 canvas 与其 `contextRegistry` 占用；
  Hero 形态改由连续体渲染。Hero 的 pretext 指针交互、滚动 scrub 不受影响（它们作用于
  DOM 标题层，与粒子层解耦）。
- [ ] **`useContinuumScroll.ts`** 骨架：先只处理 hero 单形态（morph 恒 0），打通
  chapterScrollMetrics → uniform 链路。
- [ ] **单 context 门**（见 [05](./05-guards-and-budgets.md)）：补 e2e，连续跳转 N 次后
  常驻 GL context == 1。关掉积压的「重复章节跳转 context 泄漏门」。

### 验收

- Hero 肖像**读起来是同一张肖像**、保留「粒子肖像」质感（注：技术从位移平面换成点云
  采样，不追像素级一致，追**视觉身份一致**——诚实标准）。
- reduced-motion / 无 WebGL2 下 Hero 显示现有幽灵照片，零回归。
- 现有全套 e2e 绿；常驻 context 从最多 3 → 恒 1（除转场期）。
- typecheck / lint / build / 全部 build guard 绿。

### 风险

- **持久 canvas vs 章节懒加载协调**：canvas 在 App 级常驻，章节进出不卸载它——这是
  本里程碑要啃的硬骨头。先用 hero 单形态把生命周期跑稳，再加形态。
- **肖像视觉身份**：位移平面 → 点云的观感差异。M0 接受「读得出是肖像 + 粒子质感在」，
  不追逐像素一致；若观感掉太多，可在采样里保留亮度→z 位移找回景深。
- **R3F 9 + GPUComputationRenderer**：引入路径与 React 19 并发模式的兼容性需先验证
  （见 03 的「依赖验证」）。

---

## M1 · About 解体 + 吸收 TextParticles

> 第一个形态变化，也是连续体「会变形」的首次证明。

### 步骤

- [ ] **`forms/disintegrate.ts`**：刚度→0、湍流拉满的参数集；Hero→About 滚动时
  肖像点云溃散为 curl-noise 流场。
- [ ] **吸收 TextParticles**：把 `lib/textParticles.ts` 的文字采样（`TextParticleField` /
  `ParticleTarget[]`）接成连续体的一个目标源——About 末段粒子从「尘」聚成 manifesto 文字。
  移除 `<TextParticles>` 自带 canvas 与其 context 占用（常驻 context 再减 1）。
- [ ] **`forms/stardust.ts`**：Life/Frame 的稀薄星尘——密度压到背景级，照片是主角
  （00 原则：克制即设计）。
- [ ] **Skills 不介入**：粒子在此章保持星尘/低存在感，把舞台让给红色蛇形线。
- [ ] **morph 编排**：`useContinuumScroll` 处理 hero→about→life→frame→skills 的形态序列
  与混合，per-particle seed 错峰。
- [ ] **色温联动**：About 暖纸 tint，随 `chapterTheme` 走。

### 验收

- Hero→About 平滑 morph，肖像可信地溃散再聚成文字；manifesto 文字在粒子里可读。
- Life/Frame 粒子不抢照片（密度肉眼几乎不可见，但滚动时有微动）。
- 移除 TextParticles 后 About 文字粒子表现不回退；常驻 context 再 −1。
- reduced-motion 下 About 显示现有衬线正文兜底，零回归。
- 全套门绿。

### 风险

- **文字可读性**：粒子数在 mobile 档（16k）下聚成中文 manifesto 可能糊——需按字数/字号
  调密度，或低档下文字段回退到 DOM 文本（fallback 已有）。
- **吸收 TextParticles 的采样契约**：复用其 `ParticleTarget` 但喂进 GPGPU 目标纹理，
  需一层适配；保留其原采样逻辑（已验证）避免重写引入回归。

---

## M2 · Work 数学曲面（**延后**，插槽已留）

> 本期不做。架构（`forms/registry.ts` 的插槽 + `lib/mathSurface.ts` 的纯函数位置）
> 为它留好。用户随时可把它排回来。

预留设计（备忘，不在本期执行）：
- `lib/mathSurface.ts`：洛伦兹吸引子积分 / 参数曲面采样，纯函数 + 单测。
- Work 形态：粒子凝成缓慢旋转的曲面；滚动六张项目卡时，每卡 accent 色 + 一组曲面参数
  绑定，产品列表「演奏」曲面。
- 叙事：「别人建模用 Blender，我建模用方程」——formula-lab 的化身。
- 工作量预估 1–1.5 周；是连续体里最实验、最高耦合的一段，故脊柱跑通后再做。

---

## M3 · Contact Gerstner 水面 + 终场

> 你提到的「three.js 写游戏水面」的正确落点：游戏级 Gerstner 波，作为全站终场。

### 步骤

- [ ] **`lib/gerstner.ts`**：三组 Gerstner 波叠加的波场纯函数（位移 + 法线），
  带单测（波峰位置、法线方向、参数边界）——沿用 Frame 范式。
- [ ] **`forms/gerstner.ts`**：水面形态——粒子铺成网格，sim shader 内按 `lib/gerstner.ts`
  的同一套公式做顶点位移（纯函数定义被着色器和单测共享）。
- [ ] **终场散点**：米白 footer 揭开时（Contact 进入末段），水面解体为散点退场——
  呼应 Hero 开场的「粒子凝聚」，首尾闭环（水=时间流逝，"lasts"=流逝中留下的东西，
  概念与文案咬合）。
- [ ] **亮底可读性**：Contact 是全站唯一米白章节——粒子色必须在亮底可读（暖/深色调，
  normal blend，非 additive）。
- [ ] **色温联动**：Contact tint。

### 验收

- 水面起伏自然（三波叠加有真实海面感，非正弦单波）；米白底上粒子清晰可读。
- footer 揭开时水面干净散尽，与 hero 开场呼应。
- `lib/gerstner.ts` 单测绿；reduced-motion 下 Contact 显示现有排版兜底。
- 全套门绿。

### 风险

- **亮底粒子**：连续体此前都在暗底，亮底调色是新课题；可能需 per-form 的额外描边/阴影
  让粒子在米白上立得住。
- **着色器与单测共享公式**：Gerstner 公式必须 TS 纯函数与 GLSL 严格一致（单测测 TS，
  着色器用同参数）——参数漂移会让「测过的几何」和「画出来的」不符。约定单一参数源。

---

## M4 · 打磨 + 硬化

> 把连续体从「能跑」推到「奖项级稳」。

### 步骤

- [ ] **转场搅动**：订阅 `stage === 'transitioning'`，液体波转场触发时连续体注入一次
  湍流脉冲——转场与粒子产生关联（液体波「搅动」了这团生命体）。
- [ ] **密度调音**：逐章微调 density/size/turbulence，确保 Frame/Life 让位照片、
  Hero/Contact 粒子当主角、过渡区 morph 节奏舒服。
- [ ] **全量性能门**：FPS-p95 覆盖 Hero 静置 / About morph / Contact 水面 / 章节转场
  四段热区；INP 章节跳转；连续跳转 heap/context 回基线。
- [ ] **GPU 预算守卫**（见 [05](./05-guards-and-budgets.md)）：粒子数按档上限、sim 纹理
  尺寸上限、单 context、debug 面板不进 prod bundle。
- [ ] **降级三档复核**：high/mid/mobile 实机过一遍 + low/reduced-motion/无 WebGL2 兜底。

### 验收

- 四段热区 FPS-p95 达标；连续 10 次跳转后 heap/context 回基线。
- 三档 quality + 兜底全部视觉成立、无白屏、无残影。
- 全量 e2e + gates 绿；新增 GPU 守卫并入 `test:build` 与 CI。

### 风险

- **FPS 长尾**：morph 高峰（大量粒子同时变向）是帧时间最坏点；若 p95 超标，降 sim
  纹理尺寸或分帧更新目标。
- **跨设备一致性**：移动端 GPU 差异大；mobile 档要在真机（非模拟器）验。

---

## 里程碑依赖与节奏

```
M0（脊柱，1.5 周）
 └─▶ M1（About+吸收 TextParticles，1 周）
 └─▶ M3（Contact 水面，1 周）        ← M1、M3 都只依赖 M0，可调换或并行
       └─▶ M4（打磨硬化，0.5–1 周）   ← 依赖前面形态就位
（M2 Work 曲面：延后，依赖 M0，随时插入）
```

- M0 是唯一强前置。M1 与 M3 都只依赖 M0 的脊柱，**可按兴趣调换顺序或并行**。
- 每个里程碑结束都过全套门，site 始终可发布。
