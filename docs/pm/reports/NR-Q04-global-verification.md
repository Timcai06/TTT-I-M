# NR-Q04 独立验收回报

```yaml
task_id: NR-Q04
card: docs/pm/cards/NR-Q04-global-verification.md
status: DELIVERED
qa_verdict: NOT_RUN
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-04/pm-candidate-files.json
  candidate_fingerprint_before: PASS (50/50)
  candidate_fingerprint_after: PASS (50/50)
```

## 独立结果

| 验收边界 | 结果 | 当前证据 |
| --- | --- | --- |
| Index、entry、Frame→Stack、Stack 的全局 T | PASS | 原始 `archive-global-navigation.spec.ts` 第一项在隔离 cwd 运行：12 个 `index/entry/frame-stack/stack-reading` 的 `0/.5/.999` 样本；历史扰动后 `frame-stack/.5` 与 fresh 结果相等。`wd/output/pm/NR-04/global-story-samples.json`。 |
| Frame 深链、项目子目标、Index 取消与 legacy 不争写 | PASS | 原始第二项通过：`#frame-cuisine` 深链、Index 检视后 Work 请求、`#project-educanvas` 子目标与旧 Work/Contact 区间无额外样本写入。 |
| Frame→Stack layout/GPU 最新请求 | PASS | 原始第三项通过：内容增长后保持 `frame-stack` 语义位置；真实 WebGL loss 中的新 Stack 请求在资源恢复后提交为 `stack-reading`，且为 `frame-final-horizon`。 |
| About 返回与 NR-Q03 照片路径回归 | PASS | 原始 `archive-photo-return.spec.ts` 的“足球正/反向/直达”与“About/Life/Frame 返回书签”各自独立通过；输出隔离于 `wd/output/pm/NR-03/`。 |
| 贯穿 Index→Frame 最后 Cuisine 簇→Stack 的实际流 | PASS | `qa-index-frame-stack-project-flow.json`：Index 检视、Cuisine `07/07`、Stack 语义依次达成。 |
| Final Horizon 身份、srcSet、实际裁切/内容区域 | PASS | 同一 QA 流记录 `frame-final-horizon`、`/frame/scenery/scenery-11.webp`、三档 `srcSet`、1400×1050 内容身份、两块 Three 目标的 contain 限制；滚入真实 Stack 图后浏览器读取为可见 `1228.80×720`、`object-fit: cover`、中心裁切。`qa-final-horizon-stack-geometry.png` 是实际画面，非截图存在性断言。 |
| 案例关闭不抢回旧路由 | PASS | `qa-case-close-new-stack-request.json`：案例对话框打开后触发 Stack 新请求，关闭后仍为 `stack-reading`；请求号/owner epoch 不退回，最终 URL 无项目查询参数。模态打开时背景导航从可访问性树隐藏属正确隔离，QA 以仍挂载的全局控件派发外部新请求。 |
| 暂态投影恢复与永久渲染失败可读退路 | PASS | 原始 `transient page-size failure recovers…` 和 `sample renderer failure cannot be re-shown…` 各自通过；前者恢复后重新提交，后者画布隐藏、About/Life/Frame 可读且后续 activation 不可重显。 |
| 永久“缺失 scene binding”运行时可读退路 | NOT_RUN | QA 仅拦截浏览器模型响应并同长度改名 `MonitorState_photo` / `NotebookHinge` 的两次尝试，均确认拦截发生但运行时保持 `ready`，未产生可归因 binding failure；不能以它们声称 fallback 已通过。静态 `archiveBindingContract.test.ts` 的缺失/改名/目标/属性检测通过 1/1，但不替代浏览器退路证据。 |

## 执行记录

浏览器均为系统 Chrome，端口 `4312–4330`；原始测试的相对输出被隔离到 `output/pm/NR-Q04/wd/`，未覆写 DEV 证据。最终检查无 `4312–4330` 监听，未启动 5173。

| 操作 | 结果 |
| --- | --- |
| 新 global 三项（逐项） | PASS 1/1、1/1、1/1；42.8s、15.8s、14.9s |
| NR-Q03 足球路径 / 阅读返回 | PASS 1/1、1/1；50.3s、20.6s |
| QA Index→Frame 深层→Stack 图像几何 | PASS 1/1；13.6s |
| QA 案例关闭后的新 Stack 请求 | PASS 1/1；14.9s |
| 暂态投影恢复 / 永久 renderer fault | PASS 1/1、1/1；15.7s、12.1s |
| 静态 missing-binding 检测 | PASS 1/1；0.09s |
| 浏览器 GLB 同长度改名缺失绑定注入 | NOT_RUN；两次注入后状态仍为 `ready`，未作为通过或失败产品结论。 |

## 结论

除“永久缺失绑定在浏览器中的可读退路”外，NR-Q04 指定的当前候选技术边界均以独立、当前运行证据通过。由于该未完成边界是卡片明确要求，整体 QA 结论为 **NOT_RUN**，不是 PASS，也不是产品 FAIL。

这份报告不替代 tim 对构图、镜头节奏、视觉精修或发布的决定；跨浏览器、GPU、DPR 像素一致性同样未由本卡覆盖。
