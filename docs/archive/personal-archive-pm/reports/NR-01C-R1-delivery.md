# NR-01C-R1 · DEV 修订交付报告

日期：2026-09-09  
分支：`feat/narrative-kernel`  
基线 HEAD：`55c08029051b11e9687d869747907e20291940fa`

## 结论

PM 的两个反例均已关闭，且只修改原 C 四文件：

1. `describeArchiveScene` 不再用 `flatMap` 丢弃无法识别的动画轨道。已知 Three 属性仍映射为 translation/rotation/scale/weights；其他轨道保留原 track name，编码为 `unsupported:<原 track name>` 后交给 B。等价真实 `AnimationClip` 中为选中 `NotebookOpen` 加入 `NotebookHinge.visible` 后，描述保留 `NotebookHinge / unsupported:NotebookHinge.visible`，B 返回 `invalid`，产生 `undeclared-clip-channel`，issue 包含原 track name。
2. 新增无外抛的诊断 session 初始化边界，覆盖开关读取、shadow 创建、入口冲突/注册和 cleanup。若已有任意同名全局值，不论是否 configurable，诊断不覆盖它；初始化转为 disabled shadow，默认零采样/检查/读回。cleanup 自身错误也不能阻止宿主清理。

runtime 现在只调用 `initializeArchiveStoryShadow({ model, camera })` 并注册无外抛 cleanup；唯一 `storyShadow.observe` 仍在 `draw` 的 `composer.render()` 与 shader failure 检查之后。没有把 renderer/shader 包进诊断 catch，也没有新增产品测试接口。

## 实际 runtime 故障证据

最终定点 Chromium 套件 3/3 通过，使用仓库原 Playwright 配置完成 Landing build + preview，端口 4293，真实 WebGL 可用：

- 正常开关对照：相同实际 `about-life / 0.688`；两侧均观察到 3 次 canvas `data-archive-progress` 写入，WebGL draw 命令为 587/588（允许 1 次驱动级差异），bridge DOM 属性序列均为 `ready=false,failed=false → ready=true,failed=false`；页面错误均为 0。
- 诊断初始化冲突：应用脚本前预置不可配置的 `__portfolioArchiveStoryShadow="occupied-by-existing-diagnostic"` 并显式开启诊断。真实页面仍进入 `ready=true, failed=false`，共享 archive canvas 为 `state=ready`、shot 为 `about-life`、progress 有限；原值未覆盖，页面错误 0。
- 原 renderer 故障：页面先正常 ready，再只对 `context.canvas.dataset.archiveShared === "true"` 的真实 WebGL context 注入一次 draw throw。桥随后为 `ready=false, failed=true`，canvas 为 `state=failed` 且 hidden，旧 `[personal-archive] Rendering failed` 路径收到原错误；故障前后 shadow 记录数相等，证明失败 render 没进入 post-render observe。页面未产生未捕获 pageerror。

结构化反例结果见 `output/pm/NR-01C-R1/counterexamples.json`。

## 证据口径修正

E2E 字段已从 `renderCalls` 改名为 `canvasProgressWrites`，它是紧邻 draw/render 路径的 canvas `data-archive-progress` MutationObserver 代理，不宣称直接拦截 `composer.render()`。`lifecycle` 已改名为 `bridgeDomStates`，只表示 `data-scene-ready` / `data-failed` DOM 属性序列，不冒充完整 `SurfaceEvents` 调用日志。

源码顺序测试只证明静态接缝位置；本轮新增的两条浏览器故障测试才是实际 runtime 执行证据。正常烟测仍只覆盖 About → Life，不外推到所有桥或生命周期。

## 最终检查

- C + A/B 五份目标回归：28/28 通过，退出 0。
- Landing 完整 `npx tsc -b --pretty false`：退出 0。
- C 四文件限域 ESLint：退出 0，无问题。
- `git diff --check`：退出 0。
- C 定点 Chromium/build/preview：3/3 通过，非 skip。
- 端口 4293 完成后无监听。

原始摘要见 `output/pm/NR-01C-R1/checks.txt`。

## 指纹与边界

C v1 与 R1 前后四文件 SHA-256 见 `output/pm/NR-01C-R1/hashes.txt`。A/B 十文件相对 NR-01B-R2 后状态全部一致；本轮未修改 A/B、资产、依赖、配置、Director、桥、Loader/ready、内容或样式。

构建仍仅报告既有 mediaCache dynamic-import 与大 chunk 警告，本卡未处理。未运行全站 E2E、性能、Studio 或人工逐帧视觉验收；未验证 NR-02 写入接管、legacy Action 权重及 About → Life 之外桥段。未提交、未推送、未创建分支/worktree，未进入 NR-02。
