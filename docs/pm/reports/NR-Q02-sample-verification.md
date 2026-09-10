# NR-Q02 · 样段候选独立技术验证

```yaml
task_id: NR-Q02
card_version: 1
status: DELIVERED
overall_verdict: FAIL
thread_id: 01a08484-af37-72b1-ab52-deaec8bb1184
model: gpt-5.6-sol
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-02B/pm-candidate-files.json
  candidate_match_before: 38/38
  candidate_match_after: 38/38
  browser: Google Chrome 152.0.7977.76
  default_viewport: 1280x720 DPR1
changes:
  files: []
  report_file: docs/pm/reports/NR-Q02-sample-verification.md
  evidence_dir: output/pm/NR-Q02
acceptance:
  - { id: V1, result: PASS, evidence: "QA execution 19/19；真实 GLB 动作、节点及 fresh/history 用例通过" }
  - { id: V2, result: PASS, evidence: "两桥实际相机、锚点、独立 DOM 四角重投影与提交顺序用例通过" }
  - { id: V3, result: PASS, evidence: "execution 与 legacy shadow 共 22/22；shadow 3/3 无 skip，真实 WebGL draw 可用" }
  - { id: V4, result: PASS, evidence: "独立 Index→About 长文→返回物件→书签→Work→About 路径通过；快速请求最终 owner 正确" }
  - { id: V5, result: FAIL, evidence: "GPU loss/restore + resize + 最新请求通过；但暂态投影错误恢复合法布局后仍永久 fallback" }
  - { id: V6, result: FAIL, evidence: "故障时正文 fallback 正确；故障解除后不能恢复 sample，见最小复现" }
  - { id: V7, result: PASS, evidence: "当前候选功能截图中 Index、entry/About 映射、About 正文、Frame/Stack、Work、Contact 可辨认；tim 视觉验收仍 PENDING" }
checks:
  - command_or_action: "候选 manifest SHA-256 对照"
    scope: 38 个 PM 冻结候选文件，执行前与结束时
    exit_code: 0
    result: PASS
    evidence: 38/38 match
  - command_or_action: "PLAYWRIGHT_PORT=4298 ... playwright test ... archive-execution.qa.spec.ts"
    scope: 原 archive-execution.spec.ts 的 QA 机械副本，仅把 NR-02B 证据输出路径改为 NR-Q02
    exit_code: 0
    result: PASS
    evidence: 19/19，0 fail；270.552 秒；bridge-frames.json、fresh-history.json 与截图
  - command_or_action: "PLAYWRIGHT_PORT=4299 ... playwright test ... archive-shadow.spec.ts"
    scope: 未修改的 legacy shadow 三项真实浏览器用例
    exit_code: 0
    result: PASS
    evidence: 3/3，0 fail/skip；33.664 秒
  - command_or_action: "PLAYWRIGHT_PORT=4300 ... playwright test ... independent-flow.qa.spec.ts"
    scope: QA 独立正常路径、快速请求/GPU 恢复和暂态投影反例
    exit_code: 1
    result: FAIL
    evidence: 快速请求/GPU 路径 PASS；暂态投影恢复产品反例 FAIL；另一项为 QA 全文取值错误，后续修正重跑
  - command_or_action: "PLAYWRIGHT_PORT=4303 ... --grep 'QA Index to long About'"
    scope: 修正 QA 辅助脚本后重跑独立正常路径
    exit_code: 0
    result: PASS
    evidence: 1/1；11.418 秒；qa-independent-flow.json 与两张截图
unverified:
  - tim 最终画面、材质、动画节奏与照片连续性的体验验收。
  - NR-03 尚未实现的连续照片转移动效；本卡接受 endpoint-switch-v1 为临时基线。
  - 非零 pointer 输入的跨 context 确定性、OS 真实后台标签计时、完整性能基准及不同 GPU 像素一致性。
risks_or_blockers:
  - P1：一次可恢复的页面投影尺寸失配会把 sample 锁在永久 fallback；合法布局和新导航不能恢复，需整页重载。
scope_deviations: []
rollback: 本卡只新增报告和 output/pm/NR-Q02 证据；未修改产品、既有测试、配置、资产或 DEV 证据。
cost:
  elapsed_minutes: unknown
  retries: 2
  tokens_or_cost: unknown
recommended_next_action: PM 应将 NR-02B 判为 REWORK，派定点修复暂态 sample/bridge 恢复；修复后只重验该反例及直接正常/GPU回归，不必重做架构规划。
```

## 验收结论

**FAIL，建议 NR-02B 进入定点 REWORK。** 当前冻结候选的正常路径、真实 WebGL、同帧 action/camera/projection/DOM 顺序、书签与 GPU 恢复总体成立；QA 独立发现一个可复现的恢复缺陷：临时投影尺寸异常解除后，样段仍永久停在可读 fallback，新的合法请求不能重新接管。

该缺陷不造成正文白屏，因此不是“故障时降级失败”；问题是**可恢复条件已恢复后仍不能恢复空间体验**。这与 V5/V6 的恢复要求冲突，也使 layout/font/image 时序中的一次暂态不一致可能退化为整页生命周期内永久关闭样段。

## P1 最小复现

预期：临时非法页面尺寸触发 fallback 后，恢复合法尺寸并完成新的 layout refresh，再发起 About 请求，应撤销旧失败状态，由当前 request/layout/resource generation 提交新的 `about-reading` sample。

实际复现：

1. 默认 sample 模式进入 `life-frame`，停在 `.56`。
2. 仅在浏览器内存把真实 target page 的 `clientWidth` 临时改为 `0`，滚到 `.72`。
3. 捕获 `execution-error: Page size changed without a valid layout refresh`；此时 fallback 正文可读，属于正确降级。
4. 删除临时属性，恢复真实尺寸；把 viewport 改为 `1438×899`，触发 `load`/布局刷新，再点击真实 `Scroll to ABOUT`。
5. 等待 8 秒仍未出现新的 `about-reading` commit：`data-archive-sample-fallback=true`，canvas `state=ready` 但 `shot=life-frame`、`visibility=hidden`，`life-frame data-failed=true`。

原始状态与完整记录见 [qa-transient-projection-recovery.json](../../../output/pm/NR-Q02/qa-transient-projection-recovery.json)，功能截图见 [qa-transient-projection-recovery.png](../../../output/pm/NR-Q02/qa-transient-projection-recovery.png)。该用例本轮稳定复现一次；PM 已确认进入定点修订，不再扩大变体。

静态核对与现象一致：`archiveRuntime.ts` 的 `sampleFallback()` 写入 `sampleUnavailable` 并调用 `active.events.failed()`；当前只有 GPU `webglcontextrestored` 分支清除 `sampleUnavailable`。正常 layout refresh 并不清除它，而 bridge 的 `failed=true` 也没有在合法布局恢复时重新挂接。这里只报告因果方向，不在 QA 卡内修改实现。

## 独立正常路径

QA 使用了与 DEV 主要命名用例不同的组合：真实 Index 屏幕检视 → About 长文中部 → `RETURN TO OBJECT` → entry `.48` → 重新进入原 scroll bookmark → Work 外章 → 回 About。

- About 静态正文（排除动画数字）为 671 字符；返回并再次进入后静态正文完全一致。
- bookmark 为 `scrollY=3431`，再入与从 Work 返回后均在 2px 内恢复。
- 返回物件时 canvas 为 `entry`、进度约 `.48`；About 正文不在 viewport，真实 room hit 可用。
- 最终只有 About 为样段 live reader，Life/Frame inert；`.archive-route-layer` 为 0。
- 最终 commit 为 `about-reading`，11 actions、实际 camera matrices 和完整 `permit-check → ... → render → publish` 轨迹存在；焦点落在当前 About 的 scroll indicator button。

证据：[qa-independent-flow.json](../../../output/pm/NR-Q02/qa-independent-flow.json)、[qa-about-long.png](../../../output/pm/NR-Q02/qa-about-long.png)、[qa-about-object.png](../../../output/pm/NR-Q02/qa-about-object.png)。

## 快速请求、resize 与真实 GPU 恢复

在 `about-life .44` 触发真实 `WEBGL_lose_context`，恢复等待期间先请求 Frame、resize 到 `1366×768`，再请求 About。结果为 PASS：

- resource generation `0 → 1`；layout version `7 → 11`；request ID `2 → 8`。
- 恢复后最终 segment/canvas shot 均为 `about-reading`，不是原桥或中间 Frame 请求。
- About 可交互，Frame inert，无残留 route layer；相机矩阵有限，11 actions 存在。

证据：[qa-gpu-latest-about.json](../../../output/pm/NR-Q02/qa-gpu-latest-about.json)、[qa-gpu-latest-about.png](../../../output/pm/NR-Q02/qa-gpu-latest-about.png)。这证明 GPU 恢复专门路径可清理状态，但不能抵消上面的普通暂态投影恢复缺陷。

## execution、shadow 与功能观察

QA 在冻结 manifest 上独立得到：execution 19/19 PASS；原 shadow 3/3 PASS，无 skip。系统 Chrome 和真实 WebGL draw 可用。execution QA 副本只机械替换了四处证据目录 `NR-02B → NR-Q02`，测试逻辑与候选测试一致，副本 SHA-256 为 `aa8bdc40895b99d4351fbc7efbde0f8804b18a4831e2f981a444fd66a8f4c75d`。

截图功能观察能确认 Index、entry/About 首屏映射、About 长文、Frame/Stack、Work 和 Contact 当前均有真实内容；未把截图作为材质、构图或节奏 PASS。Life/Frame 真实内容及双载体状态由 execution 实际 DOM/节点检查覆盖；NR-02 明确保留 `transferGeometryApplied=false`，未冒称 NR-03 连续照片动效完成。

DEV 最终报告和 `browser-final.json` 记录 22/22，但本结论不直接沿用：QA 自己的 19+3 轮次复现了这些目标，同时独立反例关闭了“正常套件全绿即可接受”的假设。

## 版本与清理

开始和结束时 PM manifest 38/38 SHA-256 均匹配；产品/既有测试未由 QA 修改。所有 QA 产物均在 `output/pm/NR-Q02`，辅助脚本仅服务本轮证据。临时端口 4298、4299、4300、4301、4302、4303 均无 listener；没有触碰 tim 的 5173 服务。未提交、推送或部署。
