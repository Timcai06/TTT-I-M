# NR-05 · 全站技术推广 PM 最终验收

**ACCEPTED_TECHNICAL，2026-09-10。NR-00 至 NR-05 的本轮全站叙事架构推广与技术闭环完成。** 视觉精修、最终美术节奏接受、最终收尾与发布仍等待 tim 的明确指示。

## 当前可体验版本

仓库 `/Users/tim/DEV/TTT I'M/portfolio`，分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。开发成果仍在工作区，未新增提交、推送、worktree 或部署。PM 在最终核对时确认本地 `http://127.0.0.1:5173/` 返回 HTTP 200；原 PID 53714 服务未停止或替换。

最终产品为 NR-05-R3 候选；NR-05-R4 只有只读补证，无产品或官方测试修改。PM、QA 最终核对迁移相关 **61/61 文件**一致，GLB 不变。保存了61文件哈希和60份完整文本原文：

- `output/pm/NR-05-R3/pm-accepted-files.json`
- `output/pm/NR-05-R3/pm-accepted-source.json`
- `output/pm/NR-05-R3/pm-final-verification.json`

这些是相关迁移文件的接受快照，不是整个仓库或历史每个版本的完整备份。NR-04之前逐字节回滚材料的历史缺口仍见 [NR-04验收](NR-04-pm-acceptance.md)，不把它改写成已恢复。

## 已完成行为

Index、六章正文与中间转场共13个语义段接入统一 `sampleStory → archiveExecution.sample → camera → projection/DOM → render → publish` 链；默认生产、准备、校准及GPU恢复退出旧Director/world/session写入路径。语义状态与真实动画绑定分离，唯一真实rig与请求/布局/资源代次约束保留。

真实房间物件、足球照片与Final Horizon身份保持；照片几何连续、书页与照片返回有独立前序验收。所有章节导航、物件入口、返回、Frame深主题和Work项目子目标贯通。D1仍为按当前故事位置复原物件，阅读书签独立保留。

本轮验收中实际修复了以下问题：

- 空间初始化失败可能把Loader困在开场：只有Archive renderer单独失败且其余必要资源完成时，明确进入阅读模式；不伪报3D renderReady。
- 未激活物件入口错误暴露可用性、舞台空白输入占有和投影按钮坐标问题：入口由当前owner启用，保留真实物件裁剪与正常React点击链。
- 真实点击已送达但刷新布局后偶尔提交前一个bridge：同一请求按新布局重建目标，并在提交前验证；RETURN使用语义位置而非失效像素top。
- 顶部导航与侧边章节导航保存书签不一致：统一route在离开真实阅读段时保存，正常回访与RETURN再打开恢复原阅读位置。

Contact上出现的EduCanvas图片经最终只读确认是既有有限case-collapse动画：它在dialog/路由完成后约0.66秒仍可见，约0.85秒完整移除；不是稳态Room Canvas遮挡。R4没有为此修改视觉或隐藏效果。原早截图片及错误归因报告保留，后续补证明确修正。

## 验收证据

**PM独立检查：** NR-05阶段47条相关单测加隔离执行4条真实照片几何测试，共51条通过；随后两次产品修复后均重跑完整 `tsc -b`、受影响ESLint、Loader与章节构建守卫、diff检查，最终全部exit 0。证据在 `output/pm/NR-05/pm-checks.json`、`output/pm/NR-05-R1/pm-checks.json` 和 `output/pm/NR-05-R3/pm-checks.json`。未把未重复的完整测试套件称为最终全绿。

**QA独立浏览器验收：**

- [NR-Q05主体](NR-Q05-full-rollout-verification.md)：前九段27个读回点、末段历史/直达/反向、GPU最新请求、真实缺失绑定的早期阅读退路、永久renderer失败、深Frame返回、案例焦点及既有降级政策。
- [NR-Q05-R3](NR-Q05-R3-navigation-closure.md)：正常生产的真实单页旅程 `Index → About长文 → Life真实物件 → Frame Cuisine 07/07 → Stack → Work案例开关 → Contact → About原书签 → RETURN后重新打开`；About有效阅读位置3431及比例0.9451923076923077在回访、重新打开后保持。正常快速Life点击、用户取消与导航抢占有独立当前证据。R3里Contact早截问题由下一项闭合。
- [NR-Q05-R4最终补证](NR-Q05-R4-contact-lifecycle-recheck.md)：独立1/1通过；真正媒体生命周期清理后，Contact标题和两个CTA无遮挡且实际命中正确，返回Work同一媒体可重开关闭。QA最终明确NR-Q05技术闭环PASS。

PM实际查看了QA的长文、Frame深簇和媒体退出后Contact截图，并核对连续旅程原始记录及真实事件读回。没有用DOM数量、命中正确或分段采样替代画面可读性与完整用户流程。

## 保留边界

- 现行资源政策下，两条旧degradation测试仍与实现契约冲突：Frame图片404后仍期待进入页面，以及Liquid Metal资源失败后进入已撤除的桌面Work gate。四spec历史组合为13/15，其中degradation六项4/6；这两条未删、未skip，也不记为PASS。后续若改变必要/可选资源分类，应另开卡。
- 既有mediaCache动态导入、chunk体积提示仍为建议项；未把体积设为本轮硬门槛。既存vendor完整性问题不在本轮修复范围，未宣称全部vendor/全项目守卫通过。
- 跨全部浏览器、GPU、DPR的像素一致性及艺术节奏不属于本次最终接受。案例收回动画跨章时约0.85秒的观感可由tim在视觉阶段提出调整。

## 协作结束状态

DEV、QA均idle，ARCH未加载且无运行任务；所有任务沿用tim配置的模型，PM未覆盖模型/推理设置。PM最终核4306–4383测试端口无监听，5173原服务保留。

本阶段无待派开发卡。tim可以直接查看本地前端，提供视觉、镜头、转场和阅读体验的优化方向；PM收到后再制定视觉精修任务卡。当前不自动进入视觉精修、最终收尾、提交推送或公开发布。
