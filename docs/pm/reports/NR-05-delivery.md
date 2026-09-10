# NR-05 · Work / Contact 推广与生产接管交付

状态：**DEV COMPLETE，等待 PM / QA 全站技术验收。**

分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。没有提交、推送、创建 worktree、修改 GLB/素材/依赖/声音，也没有操作已有 5173 服务。

## 结果

默认桌面从 Index 到 Contact 的 13 个语义位置现由同一个 `sampleStory → archiveExecution.sample → solveArchiveCamera → projection/DOM → render → publish` 链负责。NR-05 接入最后四段：Stack→Work、Work 阅读、Work→Contact、Contact 阅读；Work 使用真实 GLB 的四个 `WorkReading_*` 锚点，Contact 使用明确的运行时阅读平面，不把它伪列为 GLB 静态必需节点。

生产 runtime、预编译、恢复、校准和普通绘制不再调用旧 Director world/camera/navigation writer、legacy execution 或 shadow writer。旧 Director/Shadow/legacy 方法仅作为无生产引用的工具与测试面保留。所有五个 bridge、六章正文、Index、direct/hash/history/return 和 GPU 恢复共享当前 request/layout/resource generation；旧 Contact 700 ms hash 纠偏已删除。

Work 的六个项目、案例焦点/滚动暂停释放、Contact 两个按钮和 footer 局部时钟保留；桌面没有重开旧 Work gate 或 Contact 全屏 iris。窄屏与 reduced-motion 继续使用原可读 DOM 退路。

## 初始空间失败接口

统一预编译会比 NR-04 更早发现真实 GLB 缺失。初次故障注入暴露 Loader 停在 93% 的缺陷：空间已明确不可用，但正文仍被开场遮挡。

按 PM 扩展边界新增 `readingFallbackReady`：只有全部 bounded preload 已结束，且唯一失败任务为 `renderer:personal-archive` 时，Loader 才以 `reading mode ready` 完成原退出时间线。`renderReady` 仍保持 false，失败任务和原因仍在诊断快照，Archive stage 保持 `data-failed=true`，共享空间 canvas 不存在。其他资源失败或 pending 不会被放行。

四种真实 GLB 内存重打包故障（clip、node、parent、Work surface）均验证：intro 已退出、Archive failed、0 个共享 canvas、六章正文非 inert、无 execution diagnostic/sample commit，随后可导航至 Projects。证据见 `output/pm/NR-05/fallback-*.json`。

## Contact 终端边界

Contact 正文位于文档物理末端，实际 `contact-reading` span 为 `[34191, 34192]`，`maxScroll=34191`，因此浏览器唯一真实可达进度为 0。早期证据曾把三次被浏览器 clamp 的滚动误写成 0/.5/1；已纠正。

- 浏览器只记录真实可达的 Contact progress 0、页尾 maxScroll、正文 owner 与交互。
- `sampleStory` 和 camera projection 单测分别证明 Contact reading 在 0/.5/1 的 world/presentation/camera 恒定。
- 没有为测试增加空白高度或伪造滚动记录。

结构化证据为 `output/pm/NR-05/work-contact-samples.json`；功能观察截图为 `contact-reading.png`，仅证明正文可见，不代表视觉验收。

## 守卫迁移

两项源码守卫仍强制已退出的实现，均在保存完整原文后按 PM 授权迁移：

1. Loader 守卫：从 `navigate/cloneViewport/navigationPose/旧 route matrix` 字符串，改为 sample、preparePosition、readingTransition、current request 与显式阅读降级；保留 GPU 初始化/compile、后处理、持久舞台、像素开场、Index、解码和失败恢复守卫。
2. Chapter state 守卫：从 `[120,520,1100]` hash 定时纠偏与 correction listeners，改为 chapters-ready、live stage、`restore:true` 和 request ID 所有权，并负向阻止旧纠偏回归。

## 验证

最终同一产品状态：

- `apps/landing: npx tsc -b --pretty false`：exit 0。
- `npm run test:unit`：162/162，通过。
- NR-05 限域 ESLint：exit 0。
- `npm run test:build:loader`：exit 0。
- `npm run test:build:architecture`：exit 0。
- `git diff --check`：exit 0。
- 新增末四段 + 全局导航：6/6，通过。
- 真实 GLB 缺失矩阵：4/4，通过。
- Archive Shadow 等价隔离：3/3，通过。
- Project case/media/mobile：3/3，通过。
- 照片/阅读返回：4/4，通过。
- reduced、WebGL unavailable、正常 Loader、非 Archive 阻塞等最终组合均通过。

浏览器均使用本机 Chrome、单 worker、空闲端口 4313；测试结束后 4313 无监听。5173 原有进程仍在，未触碰。

第一次命令 `playwright archive-execution.spec.ts archive-photo-return.spec.ts archive-shadow.spec.ts projects-experience.spec.ts` 为 26/32，六条失败及闭合如下：

1. `fresh parsed scenes and long mixed histories reconstruct all five semantic segments identically`：旧断言只接受 `rest:work|stack-work`；统一请求的正确落点是 `work-reading`，迁移后定点通过。
2. `real GLB in-memory clip fault ...`：clip 缺失在 prepare 阶段提前拒绝，旧用例仍等待 intro 先退出；接入明确阅读退路后通过。
3. `real GLB in-memory node fault ...`：同一提前拒绝时序；阅读退路后通过。
4. `real GLB in-memory parent fault ...`：同一提前拒绝时序；阅读退路后通过。
5. `real GLB in-memory work-surface fault ...`：新增真实 Work 锚点在 prepare 阶段拒绝；阅读退路后通过。
6. `an actual renderer throw still follows the shared runtime failure path`：迁移测试在 renderer error 真正被消费前取 frame ID，期间可有合法帧；改为在 failed 时点冻结并验证此后零提交/零重显，通过。

第一次修订后运行 `playwright archive-execution + archive-rollout + archive-shadow --grep 'last four|fresh parsed|actual renderer throw'` 为 2/3，保留了 Shadow 的时点问题；随后运行 `playwright archive-execution + archive-shadow + degradation --grep 'real GLB|actual renderer throw|WebGL unavailable|non-archive bounded'` 为 7/7；最终带落盘证据的 `playwright archive-execution --grep 'real GLB'` 为 4/4。末四段/全局导航首轮命令为 6/6；最终组合 `archive-global-navigation + archive-rollout + archive-shadow + degradation` 为 13/15，其中 Archive 三组 9/9，degradation 所选六项 4/6。根目录首次误跑 `npx tsc -b` 因没有根 tsconfig 返回 TS5083；随后在卡片要求的 `apps/landing` 完整执行并通过。

上述 **13/15 是四个 spec 的组合选择，不是完整 degradation 套件**，不宣称全绿。组合内 degradation 的六项为 4/6；保留的两项不是 NR-05 新回归，也没有删/skip：

- `a 404 frame image does not strand the loader (A1)` 期望跳过 Frame 图片失败；接受基线与当前控制器实际是任何非 Archive failed 均保持 `renderReady=false`。
- `a missing Liquid Metal source cannot trap the Work gate` 同时期望资源失败仍 handoff，并操作已接受撤除的桌面 `locked/open` Work gate；当前桌面无 gate，且非 Archive preload 失败仍阻塞。

PM 已决定本卡不扩展为全站 required/optional 资源分级；这两项留待后续明确范围。全部命令、退出码和差异说明见 `output/pm/NR-05/verification.json`。

## 文件与保护边界

NR-04 接受指纹仍是比较基线。未包含于接受原文的新修改文件，在开工或扩边界后先保存于 `output/pm/NR-05/originals/`；`useFooterReveal.ts` 的原文哈希为 `20efeea70486208a35d9f9ddfa8a0f4e50d2f9c4eba74f41317437de9085396c`，新增 Loader/Preload/守卫范围也已逐文件验证快照与修改前文件哈希一致。

最终任务文件指纹见 `output/pm/NR-05/final-files.json`：33 个任务变更文件，26 个 NR-04 保护文件，共 59 个当前哈希复核，0 mismatch。NR-04 保护的 `personal-space.glb`、scene contract 和素材哈希未变化。

## 未验证边界

本卡完成技术推广，不替 tim 做最终视觉认可；未进行视觉精修、艺术节奏调整、发布或部署。Contact 截图已人工查看为正文可读，但画面风格、空间接缝观感及全站最终接受仍交 PM/QA 与 tim 后续验证。
