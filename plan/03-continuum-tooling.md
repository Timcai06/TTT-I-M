# 03 · 工具链、依赖与环境

> 连续体是**纯代码 / 程序化**路线——零外部 3D 模型、零拍摄、零建模软件
> （你没有可扫描实物，这反而让管线极简）。本文列出新增依赖、GLSL 工具链、
> 环境准备与资产策略，全部基于当前真实版本。

## 当前栈（已核对 `apps/landing/package.json`）

- `three 0.182.0` + `@react-three/fiber ^9.6.1`（React 19）
- `gsap ^3.15`、`lenis ^1.3`、`vite ^8`、`typescript ~6.0`、`eslint ^10`
- **没有** `@react-three/drei`，**没有** GPGPU / 计算着色器使用
- 现有粒子是 CPU 定位的 BufferGeometry + ShaderMaterial（各自独立 `<Canvas>`）

## 新增依赖

| 包 | 类型 | 用途 | 备注 |
|---|---|---|---|
| `vite-plugin-glsl` | dev | `.glsl` 导入 + `#include` | 让着色器写在真实文件里、可拆分复用，不再模板字符串硬抄 |
| `lygia` | 运行时（vendore 优先） | GLSL 标准库：curl/simplex 噪声、缓动、曲线 | 建议 **vendore 到 `src/lib/continuum/shaders/lygia/`** 并锁版本，避免 CDN/CSP 问题；只取用到的几个 include |
| `@react-three/drei` | 运行时 | 可选：`Points`/`shaderMaterial` 等 helper | **先评估是否真需要**——若 GPGPU 走命令式，drei 帮助有限，能不引入就不引入（控包体） |
| `leva` | **dev only** | 开发期实时调形态参数（刚度/湍流/密度） | 必须 tree-shake 出 prod；chunk 守卫断言它不在生产 bundle |

> `GPUComputationRenderer` 在 `three/examples/jsm/misc/GPUComputationRenderer.js`——**随 three 自带，
> 非新依赖**，但不在主入口导出，引入路径要确认（见下「依赖验证」）。

### 依赖验证（M0 第一件事，先验后写）

R3F 9 / React 19 / three 0.182 是较新组合，GPGPU 用法要先确认：

- [ ] `GPUComputationRenderer` 在 three 0.182 的 `examples/jsm/misc/` 可正常 import 且 API 未变。
- [ ] 在 R3F 9 的 `useFrame` 里手动推进 ping-pong（拿 `gl`/`renderer`）无冲突，
  React 19 并发模式不打断逐帧。
- [ ] `vite-plugin-glsl` 与 vite 8 兼容（版本矩阵）；`#include` 解析 lygia 路径正确。
- [ ] RGBA16F 浮点纹理在目标浏览器（含 Safari）的 WebGL2 下可渲染（`EXT_color_buffer_float`）；
  不支持则降 RGBA8 编码或提示降级。

> 若任一项受阻：GPGPU 可退化为「CPU 算目标 + GPU 仅渲染」的折中（粒子数砍半），
> 或 hand-roll ping-pong（不用 GPUComputationRenderer）。先验证再决定，别盲写。

## GLSL 工具链

- `vite-plugin-glsl` 配进 `apps/landing/vite.config.ts` 的 plugins。
- 着色器目录 `src/lib/continuum/shaders/`，`#include` lygia 的噪声/缓动。
- 纯几何（Gerstner、数学曲面）的公式**同时**存在于 TS 纯函数（带单测）与 GLSL——
  约定单一参数源（常量从 TS 导出，文档/注释交叉引用），防止「测过的几何」与「画出来的」漂移。
- 着色器编译冒烟：build 期至少跑一次 headless WebGL2 编译检查（见 [05](./05-guards-and-budgets.md)），
  GLSL 语法错误不许进 main。

## 资产策略（动态 / 静态）

| 资产 | 形态 | 字节 | 说明 |
|---|---|---|---|
| `/portrait/tim.jpg` | 已有 | — | 肖像形态的采样源，复用，不新增 |
| 蓝噪声纹理 | 静态 | ~10–30KB（KTX2 或 PNG） | 粒子抖动/采样去带状，唯一新增静态资产 |
| lygia includes | 源码 | — | vendore 进仓，只取用到的 |
| 形态目标 | **运行时生成** | 0 | 肖像采样、Gerstner/曲面解析——全部代码生成，无外部模型 |

> **零外部 3D 资产 = 无 Draco/KTX2 网格管线、无 gltf-transform**。那套（给真实模型的）
> 管线推迟到将来真有外部 glb 的那天再建（例如 TRELLIS 把你的照片生成 3D 小品的实验线）。

## 环境准备

- Node：沿用项目现有版本（CI 一致即可），无特殊要求。
- 浏览器目标：**WebGL2 必需**（GPGPU 浮点纹理）。WebGL1 / 无 WebGL → 走静态兜底
  （连续体不挂载）。这与 00 原则的降级阶梯一致。
- **WebGPU / TSL 列为 M5+ 未来**：能给计算着色器更干净的写法和更好性能，但 Safari 覆盖
  仍在成熟，且需要一套完整 WebGL 兜底（等于双写）。「降级而非删除」纪律下，WebGL2 GPGPU
  是「能交付给所有用户的最佳效果」，故为生产路径；WebGPU 待覆盖率普及再升级。
- CSP：lygia vendore 到本地后无第三方源问题；leva 仅 dev、不进 prod，不触发生产 CSP。

## 安装清单（M0 开工时执行，逐条验证后落 package.json）

```bash
cd apps/landing
npm i -D vite-plugin-glsl leva
# lygia：vendore（git submodule 或手动拷贝用到的 include 到 shaders/lygia/，锁版本）
# @react-three/drei：评估后再定，能不引则不引
```

> 装完先跑「依赖验证」清单，全绿再进 M0 的仿真实现——避免在未验证的 GPGPU 路径上
> 盲写一周。
