# NR-05 · Work / Contact 推广与生产接管完成

> 最新执行约定：沿用tim当前为负责会话配置的模型/推理设置，PM不覆盖；下方旧模型建议不再生效。额度中断后从已有成果续接。

**READY，NR04及QA缺失绑定补证已被PM接受。** DEV / tim当前会话配置，PM不改模型或推理设置。以当前实现和实际证据为准，复用前三张产品卡，不另建准备阶段。

## 完整结果

Stack→Work、Work阅读、Work→Contact、Contact阅读及这些章节的返回都进入同一语义/请求/布局/恢复链，房间按T复原，书签独立。全站默认桌面不再有旧空间writer或session访问历史依赖。保留所有正文、项目案例、窄屏/减少动态回退和既有局部效果。完成技术推广后停止，等待tim指示视觉精修与最终收尾。

依据 [NR-05P边界图](../reports/NR-05P-rollout-map.md)第2、5–7节；实际起点为NR-04最终接口及接受指纹，派发时补齐。本卡不把规划中的数值或函数名凌驾于已验证代码，发现不一致报PM并用事实收敛。

## 文件边界

缩写 S=apps/landing/src，P=S/components/personal-archive，N=S/core/narrative，L=S/lib。只授权以下文件；必要越界报告具体接口原因，由PM处理。

- P：`archiveRuntime.ts`、`archiveExecution.ts`、`archiveCameraRig.ts`、`archiveReadingSurface.ts`、`ArchiveChapterBridge.tsx`、`personal-archive.css`、`archiveSamplePosition.ts`、`sceneBindings.ts`、`ArchiveStage.tsx`、`PersonalArchiveSurface.tsx`、`ArchiveHandoffPage.tsx`、`ArchiveChapters.tsx`、`archiveDirector.ts`、`readingFrame.ts`。
- N：`types.ts`、`specs.ts`、`sampleStory.ts`、`index.ts`。
- L：`archiveRoute.ts`、`archiveReturn.ts`、`archiveReadingMemory.ts`、`chapterScroll.ts`、`lenis.ts`、`workHandoff.ts`。
- S：`components/ChapterTransition.tsx`、`chapters/work-transition/ArchiveWorkTransition.tsx`、`chapters/projects/useProjectsNarrative.ts`、`chapters/contact/ArchiveContact.tsx`、`chapters/contact/useFooterReveal.ts`、`lab/personal-space/archiveClearance.ts`。

新增测试 `apps/landing/tests/e2e/archive-rollout.spec.ts`；扩展现有semantic/spec/samplePosition/execution/cameraProjection/binding对应单测及 `tests/e2e/archive-execution.spec.ts`。C的 `tests/archiveStoryShadow.test.ts`、`tests/e2e/archive-shadow.spec.ts` 可随生产legacy撤除迁移为新链等价诊断隔离验证，保留原隔离/不影响渲染等行为，不删断言换绿。具体旧测试范围待NR04实际结果校正。

报告 `docs/pm/reports/NR-05-delivery.md`，证据 `output/pm/NR-05/`。独占产品写入；保存开工原文和指纹，保留其他已接受未提交代码。不提交/推送/建worktree/改GLB、素材、依赖或声音。

## 必须闭合

1. 抽屉、两侧rail、folder沿既有11真实动画绑定和语义时序采样，其他物件按所在T复原。Work/Contact camera、正文、hit、焦点和载体同帧提交。Contact运行时生成纸面与静态GLB节点分别验证，不把运行时节点伪列为原GLB必需项。
2. Work各真实项目子目标/案例、Contact深链、全部章节返回/再开共享当前请求。书签独立，当前阅读快照复用NR03；旧timer/WAAPI/异步finally不越过请求代次。替代完成后删Contact700ms纠偏及剩余旧导航预求端点。
3. 原桌面无gate通路保持，不因历史Laser类型存在就新增桌面Laser，Contact不重开旧全屏iris。窄屏/减少动态的WorkTransition CTA和可读正文回退保留。六个项目、媒体/Glass/Tilt/案例、Footer时钟/局部交互保持，只有真实控制权接缝才适配。
4. 全部默认生产段接管后撤sessionMap/withSession/remember、跨域seed及旧active栈回放，撤启动legacy回退入口与已无用的世界/相机/DOM writer。Lab明确迁移到新语义/相机诊断后，按引用事实决定旧Director保留范围；不为通过旧源码断言留下生产双控制。无当前入口的ArchiveRoom/ArchiveChapterRoom等不需要顺便大清理。
5. GPU/暂态布局恢复采样最新T，新请求取消旧写入；不可恢复资源失败保持正文可读、可导航，不能显示假的空间ready。保留loader真实可用性及原像素开场，诊断默认关且有界。不得新增永久rAF、第二个renderer/mixer。

## 验收与交回

新增各段0/中点/1及交界两侧的正反/直接定位，fresh与经历史到同T的真实actions/nodes/visibility/material/camera/DOM比较；沿固定容差、NaN失败。全站真实Index/导航/子锚点/项目/Contact/书签返回，中途改请求/用户取消、布局晚到、resize、GPU恢复中换请求、暂态/永久能力失败。抽查窄屏与减少动态正文可达，保护原项目案例焦点与暂停释放。

运行新增及受影响回归、完整tsc-b、限域lint/diff；复用未受影响已有证据，避免机械全量。Loader或环境skip明示NOT_RUN。核查默认生产无legacy空间writer并短暂观察静止/隐藏状态无新增永久循环，湖面等原局部动态不要求冻结。

交回实际文件指纹、命令/退出码、数值/浏览器证据与未验证边界。原配置/本机Chrome/空闲非5173端口，清理自有服务。PM独立验收后做技术汇报，不替tim做最终视觉认可，也不自动开展美术或发布。

## 已验证起点与本卡实际增量

同目录feat/narrative-kernel / HEAD55c08029051b11e9687d869747907e20291940fa。基线 `output/pm/NR-04/pm-accepted-files.json` 50文件，完整文本 `pm-accepted-source.json` 49份；见 [NR04 PM验收](../reports/NR-04-pm-acceptance.md)。新修改范围若未在该快照内，修改前先保存原文/指纹。不要只保存哈希后再覆盖。

NR04已经建立全13段SampleRanges及语义world；drawer/folder/Contact末态已有纯函数规格。runtime.drawSample目前用最后4段guard交回legacy，execution当前只采About/Life/Frame/Stack四组surface。此卡接管末四段真实Work/Contact surface/camera/DOM/返回并退出旧生产路径，不重做全局序列。NR03照片由execution独占、runtime有限readingTransition沿request/layout/resource，NR04全局导航和暂停token均复用。

允许定点更新 `tests/e2e/archive-global-navigation.spec.ts` 中原NR04末四段legacy断言，改成新实际sample接管/不争写的等价证据；此前已有的核心导航与内容断言保持。保留 `tests/e2e/archive-photo-return.spec.ts` 为受影响回归，必要接口断言变化向PM报具体原因。编译检查必须完整 `npx tsc -b --pretty false`，不能仅app项目。

所有默认生产预编译/恢复/校准/普通绘制入口也用新链，不要只删除前台guard却留下准备期旧world/session播写。独立历史测试或不再接入的只读工具保留不算生产双writer，删除与否按真实引用决定。原C诊断测试迁移到新执行链要保留隔离行为，不靠删测试换绿。

最终报告请保留实际命令/退出码日志及关键浏览器JSON，说明原失败与修复后重验的具体范围；截图仅功能观察。故障注入沿现成真实GLB重打包测试，renderer ready不代表sample能力有效，判断具体execution-error/零不合法提交/正文可读。临时服务退出后检查所有自有端口。

## PM 接口扩展 · 初始空间失败与可读退路

2026-09-10，真实故障注入发现：新sample预编译更早拒绝缺失绑定，renderer:personal-archive任务失败令preload.renderReady永久false、Loader停93%，虽正文DOM存在仍被遮挡。这是本卡必须关闭的功能缺陷，PM授权新增文件范围：`apps/landing/src/lib/resources/manifest.ts`、`preloadController.ts`、`apps/landing/src/components/Loader.tsx`；如需纯分类helper与单测，也允许新增 `apps/landing/src/lib/resources/preloadReadiness.ts`、`apps/landing/tests/preloadReadiness.test.ts`，以及定点更新原 `tests/e2e/degradation.spec.ts`。先保存这些文件原文/指纹。

实现要求：仅renderer:personal-archive可走明确的阅读模式降级；该任务仍记录失败与原因，不伪装fulfilled，不恢复场景ready。必须等正文所需的其他任务及布局确实就绪后，才能让开场退到可用正文。任何字体/章节/其他必要任务失败或未完成仍阻止就绪；不能泛化为忽略visual错误。全站可用状态应明确区分空间模式与阅读降级模式，Loader不能把空间失败显示成空间render ready，也不能在仍不可用时强行100%。选择阅读降级后可显示其真实可用完成状态，重试提示不得继续遮挡已经可用的正文。原像素开场和正常退场时间线保持。

保留archive data-failed/画布不可用事实，真实GLB node/clip/parent注入验证开场能结束、正文可读/可导航、无非法sample提交；同时证明非archive必要资源失败仍保持未就绪，正常无故障入口/原像素效果不回归。旧Work直达现在是work-reading等合法控制域迁移，以及renderer故障前已提交帧应按错误时点截断，可修正旧断言但不能删除故障后零写入要求。

## PM 守卫迁移授权

允许定点修改 `apps/landing/tests/build/loader-preload-guards.mjs`，先保存原文。当前守卫强制旧navigate/cloneViewport/navigationPose/旧route CSS矩阵等实现，与本卡撤旧writer冲突。只将已被新sample/prepare/readingTransition/统一请求替代的检查迁移到等价新合同，并覆盖阅读降级与必要失败仍阻塞；保留GPU初始化/预编译、有限值/后处理、持久舞台、像素开场上下文、真实Index、资源解码/失败恢复的无关保护。不得恢复旧代码来迎合字符串，也不得把有效守卫删空。跑该构建守卫及受影响类型/测试，报告新旧意义对应。

## PM 资源失败策略决定

采用A：本卡仅增加archive renderer的明确阅读退路，不建立全站required/optional资源分级。原preloadController对任何failed保持renderReady=false，非archive必要资源失败继续显示未就绪/重试，而非进入不完整页面。新增非archive失败阻塞用例保留。

完整degradation运行13/15，其中既有404 Frame A1期待跳过图片失败、Liquid Metal用例期待旧桌面Work gate。这两条与已接受基线的全资源就绪规则/无gate桌面路径冲突；保留原失败证据和测试，不删、不skip来制造全绿，不称本卡新回归或全套通过。交付需分别说明实际旧控制器源码、当前相关逻辑未扩大，以及这些用例的期望差异；正常资源、明确阅读降级、非archive失败重试和当前桌面无gate是本轮验收合同。完整可选资源分级或旧测试整理留后续明确范围，不成为本轮新增工作。


### PM 范围补充：章节构建守卫迁移（2026-09-10）

批准 DEV 定点修改 `apps/landing/tests/build/chapter-state-guards.mjs`，先保存原文。原 181–185 行对已移除的 120/520/1100 ms 哈希纠正定时器及 correction listeners 的要求，迁移为当前 chapters-ready、live stage、restore 及当前导航请求所有权的等价守卫；增加禁止旧纠正定时器回归的检查。其余章节守卫保持，不以恢复旧写入链或清空断言取得通过。交付报告保留迁移原因及实际检查结果。


**PM最终状态（2026-09-10）：本卡已关闭。** 全站技术推广已接受，见 `docs/pm/reports/NR-05-pm-acceptance.md`；历史READY为派发记录，不能据此重启。视觉精修、最终收尾与发布等待tim新指示。
