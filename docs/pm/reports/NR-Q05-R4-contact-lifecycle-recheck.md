# NR-Q05-R4 · Contact 媒体退出定点复核

日期：2026-09-10  
结论：**PASS。NR-Q05 当前技术闭环通过。** R3 的“Contact 稳态遮挡”报告保留，但其原因已被本次生命周期读回修正：此前截图是在 case-collapse 媒体仍存续时取得，不是 route/dialog 已结束后的稳定 Contact。最终美术与节奏仍由 tim 判断；现行资源政策下两项既存资源冲突不因本卡而计通过。

## 候选与执行边界

- 沿用冻结候选 `feat/narrative-kernel` / `55c08029051b11e9687d869747907e20291940fa`。
- QA 重新核算 `output/pm/NR-05-R3/pm-candidate-files.json`：**61/61** SHA-256 一致，0 mismatch；R4 无产品或官方测试修改。
- 正常生产浏览器路径：Work→真实案例打开→Escape→Contact→等待真正媒体生命周期清空→检查标题/CTA 命中但不激活外链→Work→同一案例重开再关闭。
- 没有 diagnostic/hardware override、force/evaluate click、样式改写、route/sample/T 定位；没有重跑 R3 已通过的整站、GPU、资产或静态套件。5173 未触碰，QA 自有 4366 端口已清理。

执行：

```text
rtk env PLAYWRIGHT_PORT=4366 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test --config playwright.qa.config.ts qa-contact-media-lifecycle.spec.ts
```

退出码 `0`，1/1 passed，14.6 秒。完整执行：[execution.json](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R4/execution.json)。构建仅报告候选既有的 dynamic-import/chunk-size 提示，未新增错误。

## 生命周期证据

| 时点（Escape 后） | 观察 |
| --- | --- |
| 48.8ms | dialog 已移除，但 `body.dataset.caseImageTransition=case-collapse`、`.case-image-transition=1`，图片仍为同一 EduCanvas `home.webp` |
| 185.4ms | Contact 已成为 `contact-reading` 且路由层为 0；媒体仍在 case-collapse，故此时不作为稳态验收 |
| 849.6ms | `caseImageTransition=null`、媒体 DOM=0、particle portal=null、project-glass=0、route layer=0、dialog=0 |
| 1100ms | Contact 滚动已稳定在 `34191`；标题和两个 CTA 处于正常可读画面 |

最终读回显示两个 CTA 均 `opacity=1` / `visibility=visible`，中心 `elementFromPoint` 分别落在各自 CTA 文本，未触发 mail/GitHub 外链；Contact owner 为 `contact-reading`。随后回到 Work，同一 `educanvas/home.webp` 媒体可见并成功重开案例；再次 Escape 后所有媒体生命周期信号再次清空。

原始记录：[qa-r4-contact-media-lifecycle.json](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R4/qa-r4-contact-media-lifecycle.json)。截图对照：[媒体退出中](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R4/contact-during-case-return.png) 与 [媒体清理后](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R4/contact-after-media-cleanup.png)。

因此，R3 的早截截图应继续保留为“过早截取的失败证据”，但不再归因为 Contact 稳态层级/Canvas 遮挡缺陷。R4 补证完成后，NR-Q05 的导航、书签、入口、取消与 Contact 生命周期技术验收均闭合。
