# NR-02B · About → Life → Frame 完整控制接管

版本 2，**READY：NR-02A 已通过 PM 独立验收**。负责 DEV，配置 `gpt-6-astra` high。本卡涉及世界、相机、DOM、导航与恢复的联合修改，提升模型处理跨文件一致性；A 与机械回归继续用 Sol/Terra。

## 结果与依据

将样段五段（About/Life/Frame 阅读停驻及两座桥）由故事位置统一驱动，完成物体→最终相机→数值投影→DOM/pass→绘制的同帧链，并让导航、返回、预热和恢复遵守同一写入许可。默认样段使用新控制，其他章节保留现有表现。沿用真实内容和照片，不做视觉精修。

本卡具体入口矩阵、帧/布局/请求字段责任、照片基线、即时路由、V1–V7验收与容差，采用已被 PM 接受的 [NR-02P 实施边界](../reports/NR-02P-execution-boundary.md)。该报告中的方法名是职责描述，NR-02A 的实际已验收 rig API 才是对接依据；不能重新创建 mixer/actions。还需读 A 实际交付/PM验收和本卡 READY 附录。

## 独占文件

产品（16）：

- `apps/landing/src/components/personal-archive/archiveRuntime.ts`
- `apps/landing/src/components/personal-archive/archiveDirector.ts`
- 新增同目录 `archiveExecution.ts`
- 新增同目录 `archiveCameraRig.ts`
- 新增同目录 `archiveSamplePosition.ts`
- 同目录 `archiveReadingSurface.ts`
- 同目录 `ArchiveStage.tsx`
- 同目录 `ArchiveChapterBridge.tsx`
- 同目录 `PersonalArchiveSurface.tsx`
- 同目录 `PersonalArchiveBridge.tsx`
- 同目录 `ArchiveIndexSurface.tsx`
- 同目录 `personal-archive.css`
- `apps/landing/src/lib/archiveRoute.ts`
- `apps/landing/src/lib/chapterScroll.ts`
- `apps/landing/src/components/ChapterTransition.tsx`
- `apps/landing/src/App.tsx`

测试（5）：新增 `apps/landing/tests/archiveExecution.test.ts`、`archiveSamplePosition.test.ts`、`archiveCameraProjection.test.ts`、`apps/landing/tests/e2e/archive-execution.spec.ts`；只为显式 legacy 兼容模式调整现有 `apps/landing/tests/e2e/archive-shadow.spec.ts`，保留原三类断言。

新报告 `docs/pm/reports/NR-02B-delivery.md`；证据 `output/pm/NR-02B/`。A rig、NR-01核心/绑定/诊断/resolver、其他测试、资产、内容、依赖与配置均保护。必要白名单外依赖报告 PM 具体原因，不自行扩写。你不是唯一执行者，保留所有他人未提交增量。

## 必须一起完成

1. 唯一 rig 执行动画；coordinator 补 monitor/照片载体与实际读回；Director 只保留 legacy 计划/相机解算，sample 不调用旧 pose 或混入 session floor。所有准备调用无 remember，sample→legacy 明确目标 seed；旧 lease/token/异步恢复不能写新 owner。
2. 真实 trigger/layout 选择 T，覆盖阅读停驻与重叠桥，不按 effect 注册顺序抢场景；无效范围不能猜测。布局刷新/恢复维持语义位置，成功提交使用同一有效版本。
3. A camera/presentation 意图驱动最终相机和 source/target 投影；数值校验完成后一次提交，所有可见性、live正文、preview、hit/交互、CSS以及focus统一归属。摄影与内容仍为原图原文；fallback保持完整正文可读可返。
4. 所有样段相关导航在旧端点 scene 预求之前分流，含同章/无源/Frame子锚点/Index检视取消/外章往返。最小即时请求事务在本卡完成，旧App延迟修正不能抢回样段位置；用户中断和新请求取消旧请求。阅读书签保留。
5. 照片采用已批准 endpoint-switch-v1，仅中间阶段；明确 `transferGeometryApplied=false`，不冒称连续照片转移完成。NR-03再完成实际移动和返回动画，不要求tim在本卡做美术决定。
6. 生产保留启动时整体 legacy 兼容模式和可读降级；唯一mode贯穿所有adapter/routes/presenter。新诊断默认关闭、只读有界、全生命周期隔离；执行错误不能吞掉。不得额外常驻 rAF、重建房间或裁掉内容以通过测试。

## 验收与交回

按照 NR-02P V1–V7 做真实动作/节点、相机与DOM独立投影、所有写入口/书签/取消/布局/恢复/故障及旧路径回归。固定原容差，不以字段stamp相同代替顺序证据，不以bbox代替透视四角。准备/失败/诊断分别记录，无success frameId冒领。

执行新增目标用例、NR-01A/B/C与NR-02A必要回归、完整TypeScript solution、限域ESLint、diff检查、新execution与原shadow的真实浏览器测试。使用仓库已有配置/本机Chrome/空闲非5173端口，可以必要构建与临时预览；不停止tim已有服务，不做全量无关E2E/Studio或性能优化。

范围较大，允许在本卡内按“协调器/legacy准备→样段物体相机投影→生命周期→路由→实测”顺序实现并分段自检，但最终交付必须全部接缝闭合。不要再拆B1/B2准备卡，也不因一次测试失败无限重做架构。

未通过项如实列出，由PM决定定点返工；完成后结构化报告并停止。不得提交推送/新建worktree/修改资产，不自行启动NR-03。PM已获用户授权在验收后继续派发至全站推广，不需要再次让用户确认普通实现选择。

## READY 对接附录

基线为同目录 `feat/narrative-kernel`、HEAD `55c08029051b11e9687d869747907e20291940fa`，叠加 [NR-02A PM 接受版本](../reports/NR-02A-pm-acceptance.md)。18 文件指纹 `output/pm/NR-02A/pm-accepted-files.json`。保存本卡额外修改文件的起始指纹，勿误将工作区未提交代码当作可清理内容。

实际 API：`claim(owner)` 返回带 generation 的对象身份令牌；`sample(token, SemanticWorld)` 返回 `applied + readback` 或 `unavailable + issues`；legacy 用 `seekLegacy(token, clip, amount)` 与 `evaluateLegacy(token)`；`readback()` 只读取，`dispose()` 失效所有令牌。每次 claim 都撤销前令牌，因此 Director 不能永久持有早期 legacy token 后在换权时复用。B 协调器须明确给当前 legacy writer 提供新 token。rig 本身不写可见性、相机或 DOM。

保留 lab `archiveClearance.ts` 已迁移四参数调用的可用性；若 Director 将求值计划分离，对其既有公开诊断 API 保持适配，不因类型可选掩盖运行错误。A 测试与 C 单元测试中的源码结构断言如因合法职责迁移必须改动，先向 PM 列明具体失效断言和等价的新证据，不删行为断言来换绿。

避免将卡片当作逐字实现模板：名称和模块内组织可以按实际代码调整，产品行为、唯一所有权、完整正文和独立验收证据是约束。文档不是美术上限；本轮不做另行美术设计。

## PM 必要接口补充（2026-09-09）

批准追加 `apps/landing/src/lab/personal-space/archiveClearance.ts` 接线：以 coordinator 执行 legacy plan 后调用纯 Director 相机解算，保留原几何采样、raycast 和判定算法及可靠释放。批准仅修改 `apps/landing/tests/archiveAnimationRig.test.ts` 中固定旧构造/claim位置的源码结构断言，以及 `apps/landing/tests/archiveStoryShadow.test.ts` 中固定旧 draw 字符串位置的 hook 顺序断言，适配职责迁移。其余真实动作/节点、token、绑定失败和诊断隔离行为断言保护；新证据仍须证明唯一 rig、sample 不调用旧 pose、C 仅在成功 legacy render 后观察。报告附旧断言→新证据对应，不以简单删断言通过。
