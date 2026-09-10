# 执行看板

2026-09-09，PM 维护。**NR-01A/B/C、NR-02A、NR-02B（含R1）已通过技术验收；NR-03也已完成技术验收；DEV沿用tim当前配置执行NR-04也已接受；DEV继续NR-05最后四段推广。tim 授权持续推进至全站推广，视觉精修与最终收尾等待另行指示。** 状态：DRAFT → READY → RUNNING → REVIEW → ACCEPTED；分支状态 BLOCKED / REWORK / PAUSED。涉及视觉的任务另记 tim 验收：PENDING / ACCEPTED / CHANGES_REQUESTED / N/A。

| ID | 工作 | 负责会话 / 模型 | 状态 | 文件所有权 | 验收 |
| --- | --- | --- | --- | --- | --- |
| PM-SETUP | 流程、入口与模板 | PM / 当前会话模型 | ACCEPTED | docs/pm（下方任务报告除外）、docs/README.md、README.md | PM 链接与范围检查通过 |
| [PA-001](cards/PA-001-baseline.md) | 当前版本与证据盘点 | 修复产品页转场与配色 / GPT-5.6 Terra medium | PAUSED | 只读产品代码；独占 reports/PA-001-baseline.md、output/pm/PA-001/ | 无有效报告，未验收；停止重试 |

## 当前连续执行授权

2026-09-09，tim 明确要求按既定协作方式持续推进，直到完成全站推广。PM 可在每卡验收后自主派发下一卡与必要定点修订，无需再次索要阶段开工确认；执行会话仍只执行自己被派发的任务卡，不越卡自行续接。

授权包括 NR-02 场景接管、NR-03 样段完整闭环、NR-04 全局协调、NR-05 各章推广及达到这些结果所必需的缺陷修复/技术回归。保持现有产品方向、真实内容与阅读书签；不自动扩大到 Studio、手机 3D 或新模型设计。

停止线：全站主要章节与入口已迁移，正反向、跳章、书签、布局/恢复和资源失败路径完成技术验收，并向 tim 汇报可体验版本与剩余问题。视觉精修、美术重设计、音效增强以及最终收尾/发布等待 tim 另行明确指示；不因原阶段编号靠后便提前执行。技术验证是本轮完成条件，不以此代替 tim 的最终视觉认可。新提交/推送继续按现有授权边界处理。

2026-09-09追加：tim已调整各会话模型，PM后续不覆盖模型/推理设置；额度中断已续接NR-03，从现有代码和证据继续。历史派发模型只作记录。

## 当前执行队列

用户方案已存档，具体建议见 [叙事内核迁移计划 v2（已确认）](narrative-runtime-plan.md)。NR-00 为 ACCEPTED（R1/R2 已由 PM 复核通过，属于规划验收）；NR-01A 为 ACCEPTED；NR-01B（含 R1）为 ACCEPTED；NR-01C 为 ACCEPTED，NR-02B（含R1）、NR-03、NR-04已接受，NR-05已交付，NR-Q05主体通过，NR-Q05-R1发现房间按钮命中层阻断，NR-05-R1已冻结，NR-Q05-R2间歇导航失败已定位，NR-05-R3已冻结，NR-Q05-R3导航闭环通过，Contact画面确认为有限退出动画，NR-Q05-R4最终补证中，执行会话不越卡；PM 按 tim 最新授权连续审查并派卡，直到全站推广完成。

- [NR-00](cards/NR-00-architecture.md)：ARCH / `gpt-6-astra` high；只读产品。已完成，见 [PM 最终规划验收](reports/NR-00-pm-acceptance.md)。原合同与修订附录均保留，ARCH 无后续任务。
- [NR-01A](cards/NR-01A-semantic-sampling.md)：ACCEPTED；DEV / Sol high；纯语义采样及必要测试已由 PM 独立复核。开发分支 `feat/narrative-kernel`，从 `55c0802` 创建，同目录无新 worktree。见 [A 的 PM 验收](reports/NR-01A-pm-review.md)。
- [NR-01B](cards/NR-01B-binding-inspection.md) 与 [R1](cards/NR-01B-R1-channel-coverage.md)：ACCEPTED；PM 独立复现漏检已关闭，19/19 测试及必要静态检查通过。见 [最终验收](reports/NR-01B-pm-acceptance.md)。
- [NR-01C](cards/NR-01C-shadow-observation.md) 与 [C-R1](cards/NR-01C-R1-diagnostic-isolation.md)：ACCEPTED；PM 独立 28/28 回归、3/3 真实浏览器测试通过，见 [最终验收](reports/NR-01C-pm-acceptance.md)。
- [NR-02P](cards/NR-02P-execution-boundary.md)：ACCEPTED（规划）；ARCH / Astra high；只读收敛 NR-02B 所有 writer 入口和 NR-02/03 接缝；以 PM 已派发 NR-02A 为约束。
- [NR-02A](cards/NR-02A-animation-execution.md)：ACCEPTED；DEV / Sol high；PM 独立34/34测试、完整tsc/lint及C浏览器3/3通过，必要lab caller已迁移。见[PM验收](reports/NR-02A-pm-acceptance.md)。
- [NR-Q01](cards/NR-Q01-promotion-acceptance.md)：ACCEPTED（只读映射）；PM核对8个源文件指纹及准确测试名。About全文、书签/返回、布局语义与GPU恢复缺口纳入B/推广实测，非产品PASS。
- [NR-02B](cards/NR-02B-sample-takeover.md)：ACCEPTED（含R1）；样段接管、取消/布局/GPU及暂态恢复均完成技术验收，见[最终验收](reports/NR-02B-pm-acceptance.md)。
- [NR-Q02](cards/NR-Q02-sample-verification.md)：DELIVERED（产品结论FAIL）；QA/Sol high；正常真实Index/长文/返回/书签/跨章与恢复中换请求通过，唯一产品缺陷交R1；38指纹保持，服务已清理。
- [NR-02B-R1](cards/NR-02B-R1-transient-recovery.md)：ACCEPTED；DEV/Sol high；仅2文件，PM40单测/tsc/lint通过；QA原反例恢复及相关路径通过，旧失败证据保留。
- [NR-Q02-R1](cards/NR-Q02-R1-recheck.md)：DELIVERED/PASS；QA/Sol high；3条路径+同路径DOM补证通过，38候选指纹不变，临时端口清理。
- [NR-03](cards/NR-03-photo-return.md)：ACCEPTED；PM44单测/tsc/lint与QA6浏览器+4几何单测通过，42最终指纹匹配，见[最终验收](reports/NR-03-pm-acceptance.md)。
- [NR-Q03](cards/NR-Q03-photo-return-verification.md)：DELIVERED/PASS；QA已停止，42指纹保持，未覆盖样式的深主题返回与恢复均有独立证据。
- [NR-05P](cards/NR-05P-rollout-map.md)：ACCEPTED（规划）；ARCH/Astra high；[PM审查](reports/NR-05P-pm-review.md)采用后续三张完整产品卡，不重复B事务；产品尚未推广。
- [NR-04](cards/NR-04-global-rollout.md)：ACCEPTED；PM48单测/完整tsc/lint，QA主体与缺失绑定补证通过，50文件及49文本接受快照，见[最终验收](reports/NR-04-pm-acceptance.md)。
- [NR-Q04](cards/NR-Q04-global-verification.md)：DELIVERED/NOT_RUN；9项浏览器及静态绑定通过，缺少有效缺失绑定运行时退路证据；非产品FAIL。
- [NR-Q04-R1](cards/NR-Q04-R1-binding-evidence.md)：DELIVERED/PASS；真实GLB三故障及单独node字段补证通过，50指纹一致。
- [NR-05](cards/NR-05-work-contact-rollout.md)：DEV COMPLETE / PM FROZEN；59候选指纹一致，等待NR-Q05独立全站验收。
- NR-05 冻结交付后派发 [NR-Q05](cards/NR-Q05-full-rollout-verification.md) 独立全站验证；PM 汇总技术闭环后停止本阶段。
- QA 按交付定点复核；视觉精修、ART、美术与音效增强及最终收尾等 tim 另行指示，不自动启动。
- 已有会话：ARCH `01a08483-8c0c-7fd0-b1a5-9ecc926e4f30`，DEV `01a08484-5199-7c22-b54e-38778cd5ed1d`，QA `01a08484-af37-72b1-ab52-deaec8bb1184`。QA执行NR-Q05-R4；DEV/ARCH停止，不新建会话。
- [基线记录](baselines/2026-09-09.md)：保存到 `baseline/personal-archive-20260909`；远程已核验为 `6137099b950745d06c1f2894d83cdf7a1826684a`，NR-00 已派发。计划已确认，NR-01A 已获用户授权；不自动提交或推送新开发成果。

## 派发记录

- NR-03 v1：B/R1技术验收后，PM派DEV/Astra high；基线38文件已冻结，明确复用当前实现与恢复修复。

- NR-02B v2：NR-02A 独立验收后正式派发 DEV/Astra high，真实 rig API 已附卡；持续实现该卡，不能退回角色初始化。

- NR-02A v1：PM 依据已确认合同放行独立动画执行步骤，DEV/Sol high；NR-02最多A/B两卡，ARCH只读核对B，不阻塞A。

- NR-02P 续接纠正：PM 状态核实发现 ARCH 完成部分读取后在上下文压缩后回退为初始化回报，两份指定报告尚不存在；不予验收。已明确续接原 READY 任务，复用已读调查与 start-fingerprints，产品继续只读。

- NR-02P v1：C/R1 验收后投递 ARCH，Astra high；仅两个报告及证据，产品只读，不重复 NR-00 全仓规划。

- NR-01C-R1 v1：PM 两个反例已复现，定点卡投递 DEV；正常烟测证据保留，补齐未知事实与初始化隔离后再验收。

- NR-01B-R2 v1：ACCEPTED；PM 独立确认唯一类型标注差异、其余九文件指纹不变，重跑完整 TypeScript solution 构建退出 0。C 浏览器检查继续。见 [R2 卡](cards/NR-01B-R2-build-type.md)。

- NR-01C v1：B/R1 验收后投递 DEV，工具确认 active，Sol high；范围以 C 卡为准，完成后 PM 审查，NR-02 未授权。

- NR-01B-R1 v1：PM 定点返工卡已准备，投递 DEV；完成后再次审查，C 未授权。

- NR-01B v1：A 的 PM 验收通过后已投递 DEV，`gpt-5.6-sol` / `high`；等待工具确认 active。范围仅 B 卡白名单，完成后 PM 审查，C 不自动开始。

- NR-01A v1：tim 已明确同意启动；任务卡已投递，等待工具确认 DEV active。分配 DEV `01a08484-5199-7c22-b54e-38778cd5ed1d`，模型 `gpt-5.6-sol` / `high`；产品写入仅任务卡白名单，报告 `reports/NR-01A-delivery.md`、证据 `output/pm/NR-01A/`。

- NR-00 v1：已向 ARCH `01a08483-8c0c-7fd0-b1a5-9ecc926e4f30` 投递，配置 `gpt-6-astra` / `high`。首轮和定点修订均已收到；PM 复核 AC-1/2/3/4 通过，NR-00 规划交付结束。D1 已确认按故事位置复原并保留阅读书签；DEV/QA 没有执行卡。

- PA-001：2026-09-09 已向 `01a06eed-d3a1-7711-84a6-f480b00a2696` 发送 v1；工具确认投递，配置 `gpt-5.6-terra` / `medium`。首轮及一次受控重试均由工具报告结束，但未取得正文或报告文件。不能判断原因，PM 不予验收，停止重试；依最新用户指示暂停。2026-09-09 再查会话为 idle，报告路径仍不存在。

新任务先填卡片再登记写入范围；已完成报告不得覆盖重写，返工用任务编号与修订号区分。

- [NR-Q05-R1](cards/NR-Q05-R1-real-user-journey.md)：READY；PM确认专项通过，但真实连续用户贯穿不能由分段采样替代，定点补证。

- [NR-Q05-R1](reports/NR-Q05-R1-real-user-journey.md)：DELIVERED/FAIL；真实Life物件入口被舞台层拦截，专项PASS不能代表全站可操作。
- [NR-05-R1](cards/NR-05-R1-room-entry-hit-testing.md)：READY；定点修复命中层与当前交互所有权，之后QA重新验收完整旅程。

- [NR-Q05-R2](cards/NR-Q05-R2-room-entry-journey-recheck.md)：READY；60文件候选冻结，验证原Life入口和真实全站连续旅程。

- [NR-05-R2](reports/NR-05-R2-click-navigation-diagnosis.md)：DELIVERED；真实事件已送达后仍可能提交旧bridge，正常模式6次2失败。
- [NR-05-R3](cards/NR-05-R3-seek-layout-commit.md)：READY；修复refresh后按当前请求语义重建落点与提交；含Contact→About返回书签。

- [NR-Q05-R3](cards/NR-Q05-R3-navigation-closure.md)：READY；61文件候选，独立复验真实完整旅程、快速点击、书签及导航抢占。

- [NR-Q05-R3](reports/NR-Q05-R3-navigation-closure.md)：导航/书签/快速点击/取消PASS，Contact图片遮挡的绘制源/退出时序尚未闭合，整体FAIL。
- [NR-05-R4](cards/NR-05-R4-contact-media-ownership.md)：READY；先区分媒体退出动画未完和真正残留，不凭矩形overlap误认3D/透明复制层。

- [NR-05-R4](reports/NR-05-R4-delivery.md)：PASS_NO_PRODUCT_CHANGE；case-image-transition约850ms自动清理，61候选不变。
- [NR-Q05-R4](cards/NR-Q05-R4-contact-lifecycle-recheck.md)：READY；仅独立验证真实媒体退出后Contact无遮挡及回Work，不重复已过导航旅程。
