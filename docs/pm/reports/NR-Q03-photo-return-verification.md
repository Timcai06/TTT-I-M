# NR-Q03 独立验收回报

```yaml
task_id: NR-Q03
card: docs/pm/cards/NR-Q03-photo-return-verification.md
status: DELIVERED
qa_verdict: PASS
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-03/pm-candidate-files.json
  candidate_fingerprint_before: PASS (42/42)
  candidate_fingerprint_after: PASS (42/42)
scope:
  verified: [photo-and-paper-carrier, readable-return-and-bookmarks, Frame-final-clusters, latest-request-GPU-resize, prior-transient-projection-recovery]
  not_a_verdict: [tim-final-art-direction, camera-rhythm, cross-browser-or-GPU-pixel-parity, general-release]
```

## 当前独立证据

| 验收边界 | 结果 | 当前证据 |
| --- | --- | --- |
| 足球原图、UV、真实曲面和承载者 | PASS | `qa-football-direct.json`：10 个正/反向样本与直达 `.40` 一致；每样本仅一个 source/transfer/wall 可见、9 点几何误差 < `1e-5`、510 个背纸坐标。`archivePhotoTransfer.test.ts` 的三项无写入限域测试通过：足球原图字节/完整 UV、9 个 UV 与 170 点目标纸面、正反随机 seek 与资源重建。隔离工作目录的第四项输出 `wd/output/pm/NR-03/source-paper-endpoint.json`：170 个源纸面代理顶点，最大贴合误差 `1.01e-16`、圆角投影 8、近零转移跳变 `5.50e-7`、85 对厚度连续。 |
| 画面观察（非美术评分） | PASS | `qa-football-0.4.png` 显示照片与白色背纸同位移动，未观察到双重照片、空白面或明显穿模。 |
| About / Life / Frame 长阅读回物件再开 | PASS | `qa-reading-return.json`：当前正文进入 inert 快照后撤回，原真实正文恢复可交互；About `2688`、Life `5528`、Frame `7948` 书签往返误差 < 2px，最终段分别为 `about-reading`、`life-reading`、`frame-reading`。 |
| Frame 最后簇与真实未遮罩返回 | PASS | `qa-frame-clusters.json`：Building `04/04`、Cuisine `07/07`、Scenery `04/04` 均从最后簇返回后复开原书签。`qa-frame-cuisine-final-cluster-return.json`：Cuisine `07/07` 的 `retract` 相位保留 3 张有有效屏幕几何且可见的图片。`qa-frame-cuisine-final-cluster-return-unmasked.png` 是未移除外层投影样式的真实中途画面。 |
| GPU 恢复、resize 与最新请求 | PASS | `qa-gpu-latest-about.json`：资源代次 `0 → 1`、布局 `7 → 10`、请求 `2 → 7`；最终仅提交最新 `about-reading`，About 可读、Frame inert。 |
| Q02 暂态投影故障回归 | PASS | `qa-transient-recovery.json`：浏览器中临时令目标 `clientWidth=0` 后得到可读 fallback（错误原因为 `Page size changed without a valid layout refresh`）；恢复宽度、resize 与 load 后，`life-frame` 重新提交，画布可见/ready、`data-failed=false`、命中区可用，投影和目标角点均为有限数。 |

## 执行记录

所有浏览器检查使用独立的 QA Playwright 配置、系统 Chrome 和隔离端口 `4306–4311`；产品端口 `5173` 未启动。输出仅写入 `output/pm/NR-Q03/`。

| 操作 | 结果 |
| --- | --- |
| 独立照片路径（正/反向 + 直达） | PASS，单项 1/1，33.6s |
| 独立 About/Life/Frame 返回与书签 | PASS，单项 1/1，21.7s |
| 独立 Frame 三最后簇 | PASS，1/1，22.2s |
| 独立 GPU 恢复中最新请求 | PASS，1/1，13.3s |
| 独立旧暂态投影恢复 | PASS，1/1，12.0s |
| 独立 Cuisine `07/07` 未遮罩返回中途画面 | PASS，1/1，11.9s |
| `node --test --test-name-pattern='real source|all nine UV|forward reverse' tests/archivePhotoTransfer.test.ts` | PASS，3/3，0.28s；排除了会写 DEV 证据目录的第四项，未覆盖或修改 DEV 输出。 |
| 隔离工作目录中的 `node --test --test-name-pattern='every source paper' …/archivePhotoTransfer.test.ts` | PASS，1/1，0.14s；该测试的写入路径解析到 `output/pm/NR-Q03/wd/`，未触及 DEV 的 `output/pm/NR-03/`。 |

一次将“返回中 GPU 最新请求”和“随后暂态投影故障”串成单一自定义长流程的尝试，在未产生完成结果或新的产品失败证据时由 QA 中断；它不计入本结论。上表改为两个独立、可复现的卡片边界用例，均通过。该组合顺序仍是未抽样边界，不应被表述为已验证。

## 结论与剩余边界

NR-Q03 卡片要求的照片/背纸连续性、长阅读回退与书签、Frame 最后簇、取消/resize/GPU 的最新请求，以及 NR-Q02 暂态投影恢复，均有当前候选上的独立通过证据，因此 QA 技术结论为 **PASS**。

这不等同于 tim 对构图、镜头节奏、动势或最终美术品质的接受；截图仅用于功能可见性排查。也不覆盖不同浏览器、GPU、DPR 的像素一致性，或上文明确标出的串联双故障顺序。
