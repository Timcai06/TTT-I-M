# NR-Q02-R1 · 暂态恢复缺陷定点复核

```yaml
task_id: NR-Q02-R1
card_version: 1
status: DELIVERED
overall_verdict: PASS
thread_id: 01a08484-af37-72b1-ab52-deaec8bb1184
model: gpt-5.6-sol
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-02B-R1/pm-candidate-files.json
  candidate_match_before: 38/38
  candidate_match_after: 38/38
  browser: Google Chrome 152.0.7977.83
  default_viewport: 1280x720 DPR1
changes:
  files: []
  report_file: docs/pm/reports/NR-Q02-R1-recheck.md
  evidence_dir: output/pm/NR-Q02-R1
acceptance:
  - id: R1-TRANSIENT
    result: PASS
    evidence: 暂态投影尺寸失败后无需 reload/GPU loss，原 life-frame 恢复实际 action/camera/DOM/hit，再提交 About 与 Life 最新请求
  - id: R1-BOOKMARK
    result: PASS
    evidence: Index→About 长文→返回物件→书签恢复→Work→About 正常路径通过
  - id: R1-GPU
    result: PASS
    evidence: 真实 GPU loss/restore 等待中快速 Frame→resize→About，最终只提交最新 About 请求
checks:
  - command_or_action: PM R1 candidate manifest SHA-256 对照
    scope: 38 个冻结文件，复验前后
    exit_code: 0
    result: PASS
    evidence: 38/38 match
  - command_or_action: "PLAYWRIGHT_PORT=4304 ... playwright test ... independent-flow-r1.qa.spec.ts"
    scope: 暂态恢复、正常书签返回、GPU恢复中换请求三项
    exit_code: 0
    result: PASS
    evidence: 3/3，0 fail；36.905 秒
  - command_or_action: "PLAYWRIGHT_PORT=4305 ... --grep 'QA repaired transient projection'"
    scope: 同一恢复路径，仅补存实际 DOM/hit 数值证据
    exit_code: 0
    result: PASS
    evidence: 1/1，13.018 秒
unverified:
  - 本卡按要求未重跑 NR-02B 全部 22 项；沿用已接受的 NR-Q02 正常套件证据，仅复验受影响路径。
  - tim 最终画面、材质、照片连续动效和节奏验收。
  - NR-03、全站推广、不相关素材/跨 context/性能矩阵。
risks_or_blockers: []
scope_deviations: []
rollback: QA 仅新增本报告与 output/pm/NR-Q02-R1；未修改产品、既有测试、配置或旧 QA/DEV 证据。
cost:
  elapsed_minutes: unknown
  retries: 0
  tokens_or_cost: unknown
recommended_next_action: PM 可关闭 NR-Q02 的 P1 恢复缺陷并审查接受 NR-02B-R1；后续卡仍需独立保留技术与 tim 视觉验收边界。
```

## 结论

**PASS。NR-Q02 发现的暂态恢复缺陷已在当前冻结候选中关闭。** 故障发生时仍正确隐藏失效画布并恢复可读正文；合法页面尺寸和新 layout 到达后，无需整页 reload 或人为 GPU loss，即可恢复原 `life-frame` 的真实世界、最终相机、DOM 投影及可交互 hit。随后 About、Life 新请求均由最新许可提交。

这只是 NR-02B-R1 的定点技术通过，不等于全站推广完成，也不代替 tim 的视觉与节奏验收。

## 原反例修后结果

操作与 NR-Q02 失败证据保持一致：在 `life-frame .56` 后把真实 target page 的 `clientWidth` 临时置零，再滚到 `.72`。本轮仍捕获预期错误 `Page size changed without a valid layout refresh`；故障阶段：

- canvas 隐藏，sample fallback 开启；About/Life/Frame 正文解除 inert，保持可读。
- `life-frame` 为 `data-scene-ready=false`、`data-failed=false`，没有把暂态问题升级为永久 bridge failure。

删除临时属性、resize 到 `1438×899` 并触发新布局后，原位置恢复为：

- `life-frame progress=0.7198093220`，permit 为 `resourceGeneration=0 / layoutVersion=11 / requestId=7`。
- 11 actions、world 节点、实际 camera view/projection 均存在且有限；target 四角为 `(385.610,199.425) / (1052.377,199.425) / (1052.377,699.576) / (385.610,699.575)`。
- bridge `ready=true / failed=false`；DOM page 恢复为 `1438×899`、实际 `matrix3d(...)`、opacity `0.789971`。
- room hit 为 `disabled=false / tabIndex=0 / pointer-events=auto`，clip polygon 与上述投影四角一致。

之后真实请求 About，再经 About→Life 页脚进入 Life；最终 `life-reading` 使用 `layoutVersion=13 / requestId=11`，fallback 已清除，canvas `ready/visible`，About inert、Life 可交互，原桥没有残留 failed。

原始证据：[qa-transient-projection-recovery.json](../../../output/pm/NR-Q02-R1/qa-transient-projection-recovery.json)、[life-frame 恢复截图](../../../output/pm/NR-Q02-R1/qa-r1-life-frame-recovered.png)、[最终 Life 截图](../../../output/pm/NR-Q02-R1/qa-transient-projection-recovery.png)。

## 直接回归

正常书签返回路径再次 PASS：About 静态正文 671 字符，长文 bookmark `scrollY=3431`；返回 entry `.48` 后再入、访问 Work 后回 About，均在 2px 内恢复，最终为 `about-reading`，样段域只有 About live，未残留 route layer。证据：[qa-independent-flow.json](../../../output/pm/NR-Q02-R1/qa-independent-flow.json)。

真实 GPU 恢复中换请求再次 PASS：从 `about-life .44` 触发 `WEBGL_lose_context`，恢复等待中依次请求 Frame、resize 到 `1366×768`、请求 About。resource generation `0→1`、layout `7→11`、request `2→8`，最终 canvas/segment 均为 `about-reading`，中间 Frame 请求未抢回。证据：[qa-gpu-latest-about.json](../../../output/pm/NR-Q02-R1/qa-gpu-latest-about.json)。

## 版本、范围与清理

复验前后 `output/pm/NR-02B-R1/pm-candidate-files.json` 的 38 个文件全部匹配；QA 未改动 R1 的 `archiveRuntime.ts`、`archive-execution.spec.ts` 或其他产品/测试文件。辅助用例只位于 `output/pm/NR-Q02-R1`，复用了 NR-Q02 流程并补充实际 DOM/hit 序列化；没有覆盖旧失败证据。

按卡未重跑全 22 项，也没有扩大故障变体。临时端口 4304、4305 已释放，未触碰 5173；未提交、推送或部署。
