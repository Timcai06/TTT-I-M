# NR-Q05 · 全站技术闭环独立验证

**READY，2026-09-10 PM 已冻结并正式派发。** QA保留tim当前模型/推理设置；产品只读。只写 `docs/pm/reports/NR-Q05-full-rollout-verification.md` 与 `output/pm/NR-Q05/`。正式派发补候选清单/实际接口，未冻结前不开验证，不与DEV产品写入并行。

目标是本轮全站技术推广完成，不是艺术验收或发布。复用NR-Q03/04已成立的方法和证据，重点最后四段及删除旧生产控制后的全站接缝；不重复每一轮所有旧套件。

## 必须独立闭合

1. 全13段都可由当前T重建，默认正常生产、预编译、恢复与校准不再走旧world/session/camera writer。核实际唯一rig/permit/同帧顺序，静止/隐藏下无新增永久循环；保留原湖面等局部动态不要求艺术效果冻结。不以全仓出现legacy字样判失败，历史工具/未接入模块与生产路径区分。
2. 新Stack→Work/Work/Work→Contact/Contact在0/中点/1及相邻边界正反/直达，fresh与经全站历史后的同T比较实际11动画、节点/物件可见性、相机和DOM角点，固定容差、NaN拒绝。回About/Index时抽屉/夹页等按T复原，阅读书签保留。Contact运行时纸面实际有效，不假设原GLB自带。
3. 真实Index→长About→Life/Frame深层→Stack→六项目/案例→Contact，以及这些章节回物件再开，正文/真实内容/书签/唯一交互/焦点成立。项目子目标与案例关闭遵循最新请求，桌面不新加Work gate或旧Contact iris；窄屏/减少动态保留既有正文与CTA退路。
4. 新请求/用户取消/resize/晚到内容或嵌套pin刷新、真实GPU loss中换请求，按最新T与布局/资源代次恢复，无旧timer/回调补写。临时投影故障合法条件回来恢复；缺失真实GLB绑定及renderer永久失败正文可读、可导航、画布不误重显。使用现成GLB重打包注入和execution-error/fallback字段；renderer ready本身不证明sample有效。
5. 抽查此前NR03照片/深Frame返回、NR04Index/Final Horizon与案例暂停接缝，确认末段推广未破坏前段。仅实际影响部分重跑。Loader未运行或skip明示，不用资源不可用但100%的状态冒充空间就绪；真实初始降级需可进入正文。

先审DEV具体覆盖再选择必要原始/新用例独立执行，加一条贯穿全站的真实用户流程。保留准确命令、退出码与日志、真实读回和少量未覆盖样式的截图；若某硬边界未验证，给最小缺口，勿填推断PASS或把静态测试当浏览器结果。一次失败与修复后定点通过要分开记。

原配置/系统Chrome/空闲非5173端口，确保原测试相对输出进入QA隔离目录、读取源资产路径正确；被中断的自有服务也清理并核端口。前后候选指纹匹配；交回PASS/FAIL/NOT_RUN及剩余边界后停止，由PM最终技术汇报，视觉精修/最终收尾发布等tim。


## NR05 实际接口与政策补充（派发前记录）

- Loader 保持 `renderReady` 真实；仅 `renderer:personal-archive` 单独失败、其他必需任务全部完成时，`readingFallbackReady` 允许明确 reading mode ready 后进入正文。其他必需资源失败仍保留 Preparation incomplete 和重试。禁止把全部视觉失败一概忽略。
- 新 prepare 链可能在启动期发现真实 GLB 绑定错误，早于 Index/诊断对象稳定暴露；应按早期失败实测有效退路，不强求旧实现的晚发错误时序。renderer ready 不等于 sample 有效。renderer 失败前已有合法帧不构成问题，应验证失败后无非法补写或画布重显。
- 完整 degradation 套件曾 13/15：两个保留的旧用例分别要求 Frame 图片 404 后继续入场、Liquid Metal 源缺失后进入旧桌面 Work gate，和现行必需资源阻止入场及无桌面 gate 政策冲突。PM 选择 archive-only 特例，未授权全站资源分类重构。QA 核实归因，不能称整套全绿，也不能只凭历史归类免验新回归。
- Contact reading 在实际页尾可能因物理滚动上限仅落 progress 0。如该阅读段世界与表现为常值，需纯采样 0/.5/1 等价和真实页尾正文可读、返回、直达证据；三条实际 progress 0 记录不可冒充三个不同位置。勿为测试制造空白滚动长度。
- 构建守卫中的旧定时哈希纠正与旧 navigate/prepare 断言已批准等价迁移；验证守卫仍对现行所有权、准备、降级、像素开场等有实际约束。


## 正式候选

- `output/pm/NR-05/pm-candidate-files.json`：59 文件，PM 独立比对 DEV 清单 0 mismatch，覆盖 NR04 全部50文件。
- `output/pm/NR-05/pm-candidate-source.json`：58 个完整文本原文，GLB 单独不可变哈希。
- `docs/pm/reports/NR-05-delivery.md` 与 `output/pm/NR-05/verification.json`：DEV 已冻结停止。准确旧测试记录为四 spec 组合13/15，其中 degradation 六条4/6，其余9/9；不是 degradation 15条。
- 当前分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`，改动未提交。QA 验证前后匹配59指纹；仅允许QA报告与QA输出写入。
