# NR-02B · PM 候选审查

2026-09-09，**REWORK，未接受**。候选为 `output/pm/NR-02B/pm-candidate-files.json` 的 38 文件指纹，分支 `feat/narrative-kernel` / HEAD `55c08029051b11e9687d869747907e20291940fa` 叠加未提交增量。DEV 已交 [正式报告](NR-02B-delivery.md)，[QA 独立复核](NR-Q02-sample-verification.md)已结束并报告一项需修缺陷。

PM 已逐项核对候选实际 hash，独立运行 9 个目标测试文件 40/40、完整 TypeScript solution、23 个候选 TS/TSX 的 ESLint 和 diff check，均退出 0。该检查在 DEV 最后 foreground-owner/校色 trace 改动后完成，覆盖当前冻结版本。摘要见 `output/pm/NR-02B/pm-static-checks.txt`。

最终 DEV 浏览器证据已核对为 **22/22、零跳过/失败/flaky，294.038秒**，起始 `2026-09-09T12:10:26.596Z`；结束后 38 候选 hash 仍一致。较早的 20 项结果属于上一轮，不作为当前冻结版结果。桥边界实际为 76 点（各 38），以最终报告和原始 JSON 为准。

代码审查确认前期反馈已落实：同 owner 的旧许可失效，真实相机和绘制前节点二次读回，逐章 live owner/焦点，样段失败后的 visible/ready 由实际 DrawResult 决定。PM 查看了 Index、entry纸面、About正文和Frame到达截图，确认对应真实内容存在；不宣称美术验收。

待 QA 实证的一个重点：sampleFallback 对非 Stale 错误锁定 sampleUnavailable，并触发适配器 failed 卸载；非法尺寸/投影恢复正常且新布局发布后，是否仍无法恢复样段。故障时正确进入可读降级不算缺陷，恢复合法条件后永久停用才构成待修问题。此处暂为源码推断，不能写成已复现。

QA 随后已独立复现上述反例：恢复尺寸并触发 resize/load、导航 About 后等待 8 秒，fallback 仍 true、canvas hidden/shot=life-frame、原桥 failed=true，没有新的 About 提交。见 `output/pm/NR-Q02/qa-transient-projection-recovery.json`。此项转为已确认缺陷，本候选需要 R1；先让 QA 完成当前冻结版其余取证，再派修，避免混合版本。

NR-03 已准备 DRAFT，必须先完成本卡 QA/必要修复再派发；未开始视觉精修或全站后续推广。
