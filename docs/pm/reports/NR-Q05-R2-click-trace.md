# NR-Q05-R2 · Life 房间入口稳定点击补证

日期：2026-09-10  
结论：**Life 入口的原 R2 失败不再足以证明产品点击失效；在稳定滚动与稳定投影点条件下，正常生产启动的真实鼠标点击成功进入 Life。** 原 R2 失败记录保留，归因为当时点击前的滚动/投影仍在收敛，不能作为产品入口故障的充分证据。本补证不构成整张 R2 用户旅程 PASS。

## 约束与候选

- 候选：`feat/narrative-kernel`，`55c08029051b11e9687d869747907e20291940fa`。
- 复核 `output/pm/NR-05-R1/pm-candidate-files.json`：60/60 候选文件与当前工作树一致（产品文件未由 QA 修改）。
- 真实生产路径：Index 可见点击 → ABOUT 长文阅读 → `RETURN TO OBJECT` → 小步真实滚轮至 Life 当前命中物件 → 稳定后普通 `page.mouse.click`。
- 未设置 `__portfolioArchiveExecutionEnabled`，未调用路由、sample/T 定位、`evaluate().click()`、force 点击或产品样式改写。运行使用既有桌面 Chrome 配置（1440×900）。

## 最小事件追踪

执行：

```text
PLAYWRIGHT_PORT=4356 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test --config playwright.qa.config.ts qa-click-trace.spec.ts
```

退出码 `0`，1/1 通过。原始记录：[stable-life-click-trace.json](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R2/diagnostic-followup/stable-life-click-trace.json)，截图：[stable-life-click.png](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R2/diagnostic-followup/stable-life-click.png)。

稳定门槛为连续三次读回 `scrollY` 相同，且 Life 命中按钮的 `x/y/width/height` 均在 0.5px 内。最终稳定在 `scrollY=4431`；此前框从约 `(234,86,412×105)` 持续移动至 `(420,224,506×130)`，故旧的提前取点不能代表稳定命中。

| 项目 | 观察结果 |
| --- | --- |
| 点击前 `elementFromPoint` | Life 命中按钮自身；与真实事件 target 相同 |
| `pointerdown` / `pointerup` / `click` | 均 `isTrusted: true`，target 为 `button.archive-bridge__room-hit--about-life`，`aria-label="打开 life"` |
| 点击时可用性 | `disabled=false`、`aria-disabled=false`、`tabIndex=0`、`pointer-events=auto`、`position=absolute`；`body` 未 inert |
| 点击前 | `#about`，Life 仍 inert；无现成导航请求数据集 |
| 点击后短读回 | 0ms/100ms/300ms 期间已为 `#life` 且路由在处理；800ms 时 `#life` 不再 inert、`archiveSampleOwner=life-reading`、现成 `archiveReadingRequest` 已清除 |

因此，补证确认真实点击到达预期按钮并触发正常导航；不存在“`elementFromPoint` 与事件 target 不同”或舞台层截获。原失败应修正为 QA 时序/坐标未稳定时的观察，不能要求基于它继续修复产品代码。

## 原旅程的后续状态（不与入口补证混同）

将稳定等待纳入同一条真实旅程后，Index→About→Life→Frame 的 Cuisine `Cluster 07 / 07`→Stack→Work 案例开关→Contact 均走到。随后 Contact 点击全局 `Scroll to ABOUT` 后，`#about` 在 10 秒内仍为 `inert`，该连续旅程在末步失败；失败截图与 trace 位于 `output/pm/NR-Q05-R2/test-results/qa-room-entry-journey-QA-R-03972-ork-Contact-and-saved-About-chromium-desktop/`。

这是一项独立于 Life 房间入口命中的待查导航/阅读书签问题。故 R2 全旅程当前仍**不判 PASS**；PM 应保留原 R2 失败记录，并把 Life 入口的产品故障判断收敛为“已由稳定真实点击排除”。最终美术、节奏与观感仍由 tim 判断。
