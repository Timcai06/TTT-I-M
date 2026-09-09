# 执行看板

2026-09-09，PM 维护。**先确定计划再开发；本轮获授权提交和推送基线，NR-00 仅负责只读规划。** 状态：DRAFT → READY → RUNNING → REVIEW → ACCEPTED；分支状态 BLOCKED / REWORK / PAUSED。涉及视觉的任务另记 tim 验收：PENDING / ACCEPTED / CHANGES_REQUESTED / N/A。

| ID | 工作 | 负责会话 / 模型 | 状态 | 文件所有权 | 验收 |
| --- | --- | --- | --- | --- | --- |
| PM-SETUP | 流程、入口与模板 | PM / 当前会话模型 | ACCEPTED | docs/pm（下方任务报告除外）、docs/README.md、README.md | PM 链接与范围检查通过 |
| [PA-001](cards/PA-001-baseline.md) | 当前版本与证据盘点 | 修复产品页转场与配色 / GPT-5.6 Terra medium | PAUSED | 只读产品代码；独占 reports/PA-001-baseline.md、output/pm/PA-001/ | 无有效报告，未验收；停止重试 |

## 只读规划与待确认开发队列

用户方案已存档，具体建议见 [叙事内核迁移计划 DRAFT v1](narrative-runtime-plan.md)。NR-00 为 RUNNING（已完成基线远程核验并投递 ARCH）；NR-01 至 NR-08 的实施部分仍为 DRAFT。

- [NR-00](cards/NR-00-architecture.md)：ARCH / `gpt-6-astra` high；只读产品。报告独占 `reports/NR-00-architecture.md`、`reports/NR-00-contract.md` 与 `output/pm/NR-00/`。
- 再由 DEV 串行完成确定性内核、同帧绑定及 About → Life → Frame 样段。
- QA 按交付定点复核；ART 在可体验样段成立后参与。
- 已有会话：ARCH `01a08483-8c0c-7fd0-b1a5-9ecc926e4f30`，DEV `01a08484-5199-7c22-b54e-38778cd5ed1d`，QA `01a08484-af37-72b1-ab52-deaec8bb1184`。DEV/QA 待命；不新建会话。
- [基线记录](baselines/2026-09-09.md)：保存到 `baseline/personal-archive-20260909`；远程已核验为 `6137099b950745d06c1f2894d83cdf7a1826684a`，NR-00 已派发。计划待 tim 确认，未授权实施。

## 派发记录

- NR-00 v1：已向 ARCH `01a08483-8c0c-7fd0-b1a5-9ecc926e4f30` 投递，配置 `gpt-6-astra` / `high`。等待工具确认 active；尚未收到或验收报告。DEV/QA 没有执行卡。

- PA-001：2026-09-09 已向 `01a06eed-d3a1-7711-84a6-f480b00a2696` 发送 v1；工具确认投递，配置 `gpt-5.6-terra` / `medium`。首轮及一次受控重试均由工具报告结束，但未取得正文或报告文件。不能判断原因，PM 不予验收，停止重试；依最新用户指示暂停。2026-09-09 再查会话为 idle，报告路径仍不存在。

新任务先填卡片再登记写入范围；已完成报告不得覆盖重写，返工用任务编号与修订号区分。
