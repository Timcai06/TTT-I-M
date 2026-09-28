# 任务回报：PA-XXX

```yaml
task_id: PA-XXX
card_version: 1
status: DELIVERED # 或 PARTIAL / BLOCKED；最终 ACCEPTED 由 PM 写看板
thread_id: 实际会话 ID
model: 实际使用的模型；无法读取则注明是派发配置
reasoning_effort: medium
baseline:
  checkout: 绝对路径
  branch: 实际分支
  head: 完整 SHA
  working_tree_evidence: 起始差异与范围哈希文件路径
changes:
  files: [] # 本任务真实修改；只读任务为 []，报告文件单列
  report_file: 绝对路径
acceptance:
  - id: AC-1
    result: PASS # 或 FAIL / NOT_RUN / UNKNOWN
    evidence: 文件路径、操作或检查输出，说明覆盖范围
checks:
  - command_or_action: 实际命令或操作
    scope: 检查范围与设备/视口（若相关）
    exit_code: 0 # 非命令操作可为 null
    result: PASS
    evidence: 具体证据路径
unverified: []
risks_or_blockers: []
scope_deviations: []
rollback: 任务增量恢复方式，或只读不涉及
cost:
  elapsed_minutes: unknown
  retries: 0
  tokens_or_cost: unknown # 不估造
recommended_next_action: 一句话
```

正文补充：结论 → 用户可见变化/事实发现 → 对验收项的解释 → 请求 PM 决策。发现路径或数据不确定时标 unknown，重新从工具取证后再更正；不反复猜测。

技术交付、PM 接受、tim 视觉接受和公开发布是不同状态。`DELIVERED` 只表示交回 PM，不能自行宣称全站达标。
