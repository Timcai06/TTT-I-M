# VR-03-R1 DEV 交付报告

日期：2026-09-10  
结论：**Frame 与 Work 两项捕获返工已形成技术候选，等待 PM 冻结及 QA/tim 浏览器定点验收。**

## Frame 捕获修复

- 捕获入口改为构造独立静态副本，只从克隆的 `.word` 清除 GSAP reveal 所有的 `opacity`、`transform`、`filter`；真实 h2 不改、不隐藏。
- ParticleScroll 新增可选 `hasVisibleCapture` 资格，并在 staging canvas 仍可读取、纹理上传和 `onCaptureReady` 之前检查真实 alpha。
- 空白或读取异常不会 ready，原文 fallback 继续保留；只有像素已就绪、handle 已被 generation controller 接纳且当前仍 live 时，输出层才能提升为 enhanced。
- cleanup、资格失效或未接纳实例不会通过 late-ready 复活增强层。

## Work 捕获修复

- Laser 仍只克隆本地 Work 标题，但克隆中全部已有 SVG id 会获得每次捕获唯一命名空间；克隆内 `url(#id)`、`href` 与 `xlink:href` 同步重写，不再依赖真实 DOM 外的 mask 定义。
- 克隆的 `.masked-heading__stage` 固定为完整 clip、opacity 1、visible；`.masked-heading__media` 去掉创建时的视差位移，只保留已存在的 fill scale 与中心 transform origin。
- 原 MaskedHeading DOM、全局动画组件、Laser vendor 与交互语义均未修改。

## 证据与边界

- PM 冻结基线：`output/pm/VR-03/pm-frozen.json`
- R1 候选清单：`output/pm/VR-03-R1/candidate-manifest.md`
- R1 完整候选：`output/pm/VR-03-R1/candidate-sources.json`
- R1 验证记录：`output/pm/VR-03-R1/verification.md`
- Work 只读审计：`docs/pm/reports/VR-03-work-capture-audit.md`

最终定向测试 19/19、类型、增量 Lint、production build、完整 guards、vendor integrity、冻结核对与快照恢复全部通过。VR-03 原 24 文件中 18/24 保持冻结一致；6 个变化全部属于 R1 白名单，0 越界。

没有运行浏览器、Playwright、截图或人工视觉验收，不能据此声称真实 Chromium HTML-in-Canvas 的 Frame 粒子字形、Work 照片字形 mask 或最终观感已通过。没有提交、推送、发布，也没有操作现有服务。DEV 在此停止写入，等待 PM 冻结后由 QA/tim 定点复核。
