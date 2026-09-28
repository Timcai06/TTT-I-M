# NR-02B-R1 · 暂态布局/投影失败恢复交付

```yaml
task_id: NR-02B-R1
card_version: 1
status: DELIVERED # 交回 PM，不代表 PM/QA ACCEPTED 或 tim 视觉接受
thread_id: 01a08484-5199-7c22-b54e-38778cd5ed1d
model: gpt-5.6-sol
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-02B/pm-candidate-files.json
changes:
  product_files: 1
  test_files: 1
  file_manifest: output/pm/NR-02B-R1/final-files.json
checks:
  pre_fix_reproduction: PASS
  unit: PASS # 40/40
  typescript_solution: PASS
  scoped_eslint: PASS
  diff_check: PASS
  related_browser: PASS # 11/11，0 skipped/unexpected/flaky
  protected_candidate_files: PASS # 36/36
unverified:
  - NR-02B 原完整 22 项浏览器矩阵未重跑；本卡按要求仅跑 11 项关联回归
  - 不受影响的素材、跨 context、完整性能和 lab 全量矩阵
  - tim 最终画面与节奏验收
scope_deviations: []
cost:
  elapsed_minutes: unknown
  retries: unknown
  tokens_or_cost: unknown
recommended_next_action: PM/QA 定点复核本修复；DEV 停止，不自行启动 NR-03。
```

## 交回结果

已修复 QA 冻结证据中的恢复缺陷：一次暂态页面尺寸/投影失败不再把 sample 能力永久锁死。故障时仍撤掉旧画布、空间 hit 与失效执行许可，正文保持可读；同一无效条件被缓存，不由 ambient 调度无限重试。新的有效布局、当前请求或新的 WebGL `resourceGeneration` 会解除该次暂态缓存，只有完整执行、投影、render 和 publish 成功后才恢复画布、bridge ready、hit 与唯一正文 owner。

永久能力缺失和全局 renderer 失败边界不变：缺 clip、node 或正确 parent 仍记录为不可恢复 sample 能力失败，普通 resize/load/新请求不会伪恢复；真实 renderer failure 仍进入全局 failed。

实际只修改：

- `apps/landing/src/components/personal-archive/archiveRuntime.ts`：为暂态失败记录 `{layoutVersion, requestId, resourceGeneration}`，暂态走 pending，永久能力缺失仍走 failed；相同无效条件短路，合法新条件重试，成功提交清除暂态状态。
- `apps/landing/tests/e2e/archive-execution.spec.ts`：加入 QA 反例恢复和 WebGL generation 边界回归，并加强永久 GLB 绑定失败经 resize/load/新请求后仍不恢复的断言。

卡片另授权的 `ArchiveChapterBridge.tsx`、`ArchiveStage.tsx`、`archiveReadingSurface.ts` 经实现核对不需要修改，三者指纹保持 NR-02B 冻结值。没有修改 rig、语义、资产、内容、依赖、配置或其他章节；没有提交、推送、建 worktree、发布或操作 5173。

## 行为验收

修前新增用例可靠复现：life-frame `.56` 后把目标页 `clientWidth` 暂时置零，再到 `.72`；恢复尺寸并请求 About 后等待 10 秒，最后一次提交仍停在 `life-frame`，用例失败。

修后覆盖并通过：

1. 故障期画布隐藏、archive visible 清除、两个 room hit 禁用、About/Life/Frame 正文解除 inert 且 About 全文可读；等待 400 ms 错误记录数量不增长，证明同一条件没有永久轮询。
2. 恢复真实尺寸，触发新的 viewport/layout 与 load 后，当前 life-frame 请求产生更大的 frameId；实际四角投影重新核对，bridge ready 与 hit 恢复。
3. 随后导航 About、再由真实 About→Life 页脚入口导航 Life，分别产生新的 `about-reading`、`life-reading` 提交，正文可读；无需整页 reload 或故意 GPU loss。
4. 单独的 generation 用例在相同布局/请求键下制造真实 WebGL loss/restore；新 `resourceGeneration` 可越过旧暂态缓存并重新提交、校验投影与 ready，证明缓存不会污染下一代 GPU 资源。
5. clip/node/parent 三类永久 GLB 绑定故障在 resize、load 和 Frame 新请求后仍保持 fallback 且没有任何 sample commit；renderer failure、非法投影、GPU 恢复换请求、书签/快跳、load 增长等关联用例全部保持通过。

最终系统 Chrome 关联批次 11/11 PASS，0 skipped、0 unexpected、0 flaky，85.517 秒。结果见 `output/pm/NR-02B-R1/browser-final.json`。最终两项恢复定点结果见 `browser-recovery-final.json`。QA 原反例证据保留在 `output/pm/NR-Q02/qa-transient-projection-recovery.json` 及同名截图。

## 静态、单测与范围证据

- 原 40 项目标单测：40/40 PASS，0 failed/skipped。
- 完整 `tsc -b`：退出 0。
- 实际修改的 runtime 与 E2E TypeScript 限域 ESLint：退出 0。
- `git diff --check`：退出 0。
- NR-02B 38 文件候选逐项重算 SHA-256：仅上述两份文件变化，其余 36/36 一致。最终哈希见 `output/pm/NR-02B-R1/final-files.json`。
- 临时端口 4298 已释放；没有使用或重启 5173。

完整检查摘要见 `output/pm/NR-02B-R1/checks.txt`。构建仍只有既有 mediaCache 静态/动态混合导入与 chunk 超 720 kB 警告，本卡未改配置。

有一轮中间关联测试仅因验证脚本点击了页面上不可用/被遮挡的 LIFE action 而失败；产品恢复、About 提交此前已通过。测试改为使用真实 About→Life 页脚路由后，在最终源码上先通过 2/2 恢复定点，再通过 11/11 全部关联回归；未因此放宽产品断言。

## 回退与剩余边界

若需回退，仅反向撤销本卡在 `archiveRuntime.ts` 与 `archive-execution.spec.ts` 的增量，并以 `final-files.json` 的 baseline SHA-256 复核。不得按 HEAD 覆盖或整体 reset，因为工作区还包含 NR-01/NR-02 及其他既有未提交增量。报告与证据可保留。

本卡没有重跑 NR-02B 全部 22 项或不受影响的跨 context/素材矩阵，不能把 11 项关联通过扩大解释为全站重新验收。技术交付、PM/QA 接受、tim 视觉接受和发布仍是四个独立状态。DEV 于此停止，等待 PM/QA 定点复核，不启动 NR-03。
