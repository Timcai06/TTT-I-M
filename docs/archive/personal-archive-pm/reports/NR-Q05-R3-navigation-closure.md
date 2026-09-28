# NR-Q05-R3 · 导航刷新修复与全站闭环验收

日期：2026-09-10  
结论：**导航刷新/语义落点闭环 PASS；本卡整体暂不 PASS。** 本卡规定的正常生产 Life 入口重复、一次不 reload/reset 的连续用户旅程、About 有效阅读书签与 RETURN 重开，以及真实 wheel 取消均由 QA 当前浏览器独立通过；但追加的 Contact 可读性补测显示稳定后仍有项目预览视觉覆盖第二个 CTA 的右侧，不能把“DOM 数量为 2”当作两 CTA 正常可读。此前 R1/R2 失败报告保留为历史证据；R3 仅说明冻结的 61 文件候选已闭合其导航刷新/语义落点问题，不代表 tim 的最终美术、节奏或发布验收。

## 候选与边界

- 分支与 HEAD：`feat/narrative-kernel` / `55c08029051b11e9687d869747907e20291940fa`。
- QA 复算 `output/pm/NR-05-R3/pm-candidate-files.json`：**61/61** 文件 SHA-256 一致，0 mismatch。
- QA 只新增 `output/pm/NR-Q05-R3/` 下的验收脚本和证据，以及本报告；未修改产品、官方测试或冻结候选。
- 运行使用系统 Chrome、桌面 1440×900、正常生产路径；没有 diagnostic flag、硬件 override、直接 T/route/sample 定位、force/evaluate click 或样式改写。5173 未触碰；QA 自有 4360–4362 端口已清理。
- PM 已独立完成本修复相关静态检查；QA 没有重复无关套件。

## 当前浏览器执行

```text
rtk env PLAYWRIGHT_PORT=4362 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test --config playwright.qa.config.ts qa-navigation-closure.spec.ts
```

退出码 `0`，3/3 passed，60.0 秒。完整执行结果：[execution.json](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R3/execution.json)。构建阶段仅出现候选既有的 `mediaCache.ts` dynamic-import 与 chunk-size 提示，未见测试或构建错误。

| 验收项 | 当前证据 | 结果 |
| --- | --- | --- |
| 连续真实旅程 | Index→About→RETURN→稳定 Life 物件普通鼠标点击→Frame 真实滚轮至 `Cluster 07 / 07`→Stack→Work 实际案例开关→Contact→About | `qa-r3-continuous-journey.json` | PASS（导航） |
| About 有效书签 | 记录于 `scroll=3431`、`ratio=0.9451923076923077`、`inert=false`；708 字正文，最后可视阅读文本在视口，滚动连续三次稳定 | 同上、`journey-about-bookmark.png` | PASS |
| Contact 回 About 与 RETURN 重开 | 两次均恢复 `scroll=3431` 与相同 ratio，且 About 非 inert；RETURN 先回物件、再以普通入口点击重开 | `qa-r3-continuous-journey.json` | PASS |
| Life 快速入口 | 3 个独立正常模式尝试均在稳定投影点点击；`pointerdown/up/click` 均为 trusted 且 target 为“打开 life”，随后 `archive-request-start`；最终 `#life`、`life-reading`、Life 非 inert | `qa-r3-rapid-life-clicks.json` | PASS (3/3) |
| 最新请求/取消反例 | 发起 Contact 后真实 wheel；读回事件顺序为 `archive-request-start`,`wheel`，最终 owner=`work-contact`，未被旧路由改成 `contact-reading` | `qa-r3-wheel-cancel.json` | PASS |
| Contact 稳定可读性补测 | 路由层/项目 dialog 均已清理，标题与两 CTA 的 DOM 命中正确；但稳定截图仍显示 3D 项目预览跨越第二 CTA 的右侧 | `qa-r3-contact-settled.json`、`journey-contact-settled.png` | **FAIL** |

连续旅程中 Life 点击前的对象确实先收敛：其投影框与滚动在 10 个短读回后稳定于 `scroll=4391`，此时 `elementFromPoint` owner 是“打开 life”。点击事件没有被舞台层截获；最终 owner 为 `life-reading`。Frame 不是将全局导航直接等同于 Cuisine，而是在实际可见 Frame 主题中使用真实滚轮进入末簇。

## Contact 补测与阻塞项

原 `journey-contact.png` 确实截在 Work 预览仍占据画面的状态。按 PM 指令，QA 不重跑完整旅程，只从真实 Work 案例开关关闭后再走正常 `Scroll to CONTACT`，等待路由层清理及连续三次 `scroll=34191` 稳定，再检查且不触发外链。

读回显示 `#contact` 非 inert、标题在视口、两 CTA 都是 `opacity=1` / `pointer-events=auto`，各中心的 `elementFromPoint` 为 CTA 文本本身；路由层数和项目 dialog 数均为 0。但同一稳定截图中仍有固定全视口 `.archive-stage` / Canvas（`pointer-events:none`）在视觉上展示 EduCanvas 项目预览；它横跨第二 CTA 右侧。DOM 还可见 `archive-handoff-page--contact` 处于 `z-index:10000` 的非交互投影复制层。这不是外链不可点的拦截问题，而是 Contact 阅读画面尚被上游项目预览视觉遮挡，因而“两个 CTA 正常可读”的验收条件未满足。

补充证据：[Contact 稳定读回](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R3/qa-r3-contact-settled.json)、[Contact 稳定截图](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R3/journey-contact-settled.png)。需要 PM/DEV 以新卡处理该投影/画面所有权问题；QA 不建议在此 61 文件候选上继续掩盖或改产品。

其他截图： [About 书签](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R3/journey-about-bookmark.png)、[Cuisine 末簇](/Users/tim/DEV/TTT%20I'M/portfolio/output/pm/NR-Q05-R3/journey-frame-cuisine-final.png)。

## 未覆盖边界

- 本卡没有重新运行全资产/GPU/几何/静态全套；它们仍应以各自验收卡为准。
- 本结论不代替 tim 对美术质量、镜头节奏和发布环境的最终判断。
