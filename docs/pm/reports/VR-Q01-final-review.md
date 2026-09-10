# VR-Q01 第二轮最终窄审（VR-03 pre-R1）

## 结论

**NEEDS_REVISION**。VR-03 的冻结候选与核心快照边界均已核对，但 Frame 标题粒子效果存在一个明确代码缺陷，不能以现有 Node/build 记录关闭。PM 已将该项退回 DEV 进行最小 R1 修复；本轮到此停止，待新的冻结清单再作局部复核。

这不是对真实视觉效果的判断。原始语义标题仍保留在 DOM；问题是粒子增强可能对一个空白 capture 错误地进入 ready，从而出现“效果缺失但增强已开启”的状态。

## 已完成的冻结与边界核对

- 审查 checkout：`feat/narrative-kernel`，`55c08029051b11e9687d869747907e20291940fa`。
- `output/pm/VR-03/pm-frozen.json`：24/24 当前文件 SHA-256 与冻结候选一致。
- VR-01/VR-02A/VR-02B：34 个未解冻文件仍与原 accepted snapshots 一致；`tests/build/chunk-guards.mjs` 是唯一授权变动，当前 hash 与 VR-03 冻结值一致。未发现未授权核心漂移。
- 已阅读 VR-03 delivery/verification、PM 中途提示以及 Decrypt/Glass vendor provenance。vendor `integrity.json` 的 Decrypt、Glass、Laser、ParticleScroll 登记与对应冻结源码一致；其中 Decrypt/Glass 的既有本地补丁来源有独立审阅记录，未通过放宽守卫掩盖差异。

## 阻断项：Frame capture 可以把不可见标题当作成功首帧

**严重度：P1（局部效果错误 ready，退回修复）**

`ArchiveTextPanel` 在真实 `h2` 上调用 `revealWordsOnce`。该函数先把文字拆为 `.word`，并以 GSAP 写入初始 `opacity: 0`、`yPercent: 30` 与（非 reduced-motion 下）`filter: blur(...)`。`FrameTitleParticles` 的异步挂载随后直接 `target.cloneNode(true)`，没有剥离这些仅服务于原 DOM 一次揭示的内联状态。

ParticleScroll vendor 的 `onpaint` 只要 `drawElementImage` 没抛错就标记 `contentDirty`；`uploadContent` 将任意这类 paint 直接作为 `onCaptureReady`，不检查捕获像素是否实际可见。因此透明/移出的标题副本可能被上传并触发 `enhanced`。真实标题未被隐藏，但装饰层会认为首帧已成立，违反 manifest 所写“标题 readable 才增强”的前提。

最小修复方向已交 PM/DEV：使用静态、可绘制的标题 capture（或克隆后递归清除 reveal-only 的 `opacity`、`transform`、`filter` 等短暂内联样式），并在 ready 前验证有效可见 capture；不得修改、隐藏或替换真实语义标题。修复应补一个能覆盖“已 split/初始隐藏样式”与空白 paint 不得 ready 的定点测试。

定位：

- `apps/landing/src/components/frame/ArchiveTextPanel.tsx`：`revealWordsOnce` 调用。
- `apps/landing/src/components/frame/FrameTitleParticles.tsx`：capture clone 与 `enhanced` 交接。
- `apps/landing/src/lib/wordReveal.ts`：初始 token 样式。
- `apps/landing/src/lib/canvas-ui/vendor/ParticleScroll/ParticleScrollVanilla.ts`：`contentDirty` / `onCaptureReady` 路径。

## 未执行与下一轮要求

- 为避免将未覆盖缺陷的 11 项 Node 检查、build 或 guards 误写成对该缺陷的通过，本轮未复跑它们；VR-03 delivery 中的既有记录仅作待复核输入，不是本结论的替代证据。
- 未启动浏览器、Playwright、服务、截图或人工效果测试；真实 GPU/HTML-in-Canvas 可绘制性、Frame 实际粒子、Work Glass/Laser 和 Contact Liquid 仍为 **NOT_RUN**。
- R1 冻结后，仅需复核修复文件、更新的 guard/test、完整性登记（如变动）、VR-03 hash 和上述未覆盖的定点检查；不重复无变化的 VR-01 几何采样。

## 证据

- [pre-r1-review-evidence.md](../../../output/pm/VR-Q01-final/pre-r1-review-evidence.md)
- [VR-03 frozen manifest](../../../output/pm/VR-03/pm-frozen.json)
