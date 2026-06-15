# Plan · 粒子连续体（Particle Continuum）

> 这个目录是**下一阶段的工程蓝图**：把站点从「一组各自为政的视觉效果」推进到
> 「一个贯穿全站、有生命的粒子系统」——奖项级作品的视觉脊柱。
>
> 上一版 plan（landing → 内容平台的多 zone 迁移）**已全部落地**，其决策记录与
> 交付清单浓缩保存在 [`06-roadmap.md` 的「已交付架构（冻结）」](./06-roadmap.md)。
> 本目录从此只向前看。

## 一句话

> 全站只有**一个持久的粒子系统**（App 级、固定全屏、活在所有章节懒加载之外）。
> 滚动驱动它在章节之间**变形**：Hero 是肖像，About 解体成尘，Work 凝成数学曲面，
> Contact 化为水面后散尽。不是「这站有三个粒子效果」，而是「这一团东西陪你走完全程，
> 它一直在变成这一章需要的样子」。**连续性本身就是叙事。**

## 为什么是它（产品判断）

参照 `优秀案例拆解` 里六个获奖站的规律：评委打分的是**设计 / 创意 / 体验 / 内容**，
不是引擎自研度。我们不自研引擎（`three` + R3F 就是获奖栈），把「自研」预算全部投到
**只属于你的内容**——而连续体恰恰是系统级原创：别的站有粒子、有数学图、有水，但没有
「一个生命体连续变形贯穿全程」。这是机器和模板复刻不了的一笔。

详见 [`01-continuum-architecture.md` · 设计意图](./01-continuum-architecture.md)。

## 本期范围（用户已定）

实现 **M0 / M1 / M2 / M3 / M4**：先完成 App 级 Continuum 与滚动叙事单源，
再把 About、Frame/Stack、Work、Contact 都接入同一个形态系统，最后补运行纪律和 GPU 守卫。
Hero 的原 `ParticlePortrait` 主体继续保留；单 context 合并只作为后续候选，不作为当前完成条件。

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M0** | App 级 Continuum + GPGPU 仿真 + 滚动叙事单源 + stage/frameloop 运行门控 | 已完成 |
| **M1** | About 解体 + 星尘流场 + 双目标 morph + 退役 TextParticles canvas | 已完成 |
| **M2** | Work 数学曲面 | 已完成 |
| **M3** | Contact Gerstner 水面 + 亮底 normal blend | 已完成 |
| **M4** | GPU 预算/ shader 冒烟 / context e2e / Continuum FPS 顾问门 | 已完成（转场搅动视觉脉冲暂缓） |

详细拆解见 [`02-continuum-milestones.md`](./02-continuum-milestones.md)。

## 目录导航

| 文件 | 内容 |
|---|---|
| [`00-principles.md`](./00-principles.md) | 不可违背的原则（视觉/性能护栏 + 新增 GPU/粒子不变量）**先读** |
| [`01-continuum-architecture.md`](./01-continuum-architecture.md) | 连续体核心架构：持久 canvas、GPGPU 仿真、形态注册表、模块边界 |
| [`02-continuum-milestones.md`](./02-continuum-milestones.md) | M0/M1/M2/M3/M4 逐里程碑执行计划（步骤 / 验收 / 风险） |
| [`03-continuum-tooling.md`](./03-continuum-tooling.md) | 依赖、GLSL 工具链、环境准备、资产策略 |
| [`04-content-layer.md`](./04-content-layer.md) | 内容层端口-适配器（**已交付，稳定参考**；代码注释仍指向本文） |
| [`05-guards-and-budgets.md`](./05-guards-and-budgets.md) | 守卫与预算：现有守卫 + GPU 时代新增门 |
| [`06-roadmap.md`](./06-roadmap.md) | 执行清单（勾选当 todo）+ 已交付架构冻结档 |

## 决策记录（Decision Log）

| 决策 | 选择 | 理由 |
|---|---|---|
| 旗舰方向 | **跨章节粒子连续体** | 系统级原创；建立在已有粒子基建上；连续性即叙事 |
| 渲染计算 | **WebGL2 GPGPU**（ping-pong FBO） | 通用 + 已验证；WebGPU/TSL 列为 M5+ 未来，不做 M0 依赖（覆盖率 + 降级纪律） |
| 三场合一 | **暂缓强合并** | Hero 原肖像主体已确认，当前以 stage/frameloop/context 守卫控风险；无损合并再进入 M0b/M5 |
| Work 数学曲面 | **已纳入 M2** | 作为低存在感背景轨迹，不替代项目截图 |
| 资产来源 | **纯程序化**，零外部模型/拍摄 | 你没有可扫描实物；粒子/水面/曲面全部代码生成，叙事真实 |
| 颜色 | **读章节色温** | 复用 `chapterThemeTokens.ts` + `landingScrollNarrative`，颜色保持 token 派生 |
| 降级 | **每个形态都有非 WebGL 静态兜底** | 沿用「降级而非删除」；各章现有 fallback 直接复用 |

## 工作流约定（沿用）

- 每个里程碑独立可上线、有守卫兜底；site 始终可发布。
- 评审 → 用户显式批准后才提交 git。
- 性能验证用真实 Chromium + trace，不依赖 Claude Preview（该项目 Preview 不可靠）。
