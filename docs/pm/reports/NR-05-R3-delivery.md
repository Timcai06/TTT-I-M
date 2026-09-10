# NR-05-R3 DEV 交付报告

**状态：READY_FOR_PM_FREEZE。** 本轮在 `archiveRoute.ts` 内闭合布局刷新后的语义落点、跨入口书签保存与最终提交校验；没有修改 Runtime、3D/视觉、内容、依赖或配置。未提交、未推送、未发布，也不代替 QA 的完整连续旅程与 tim 的视觉验收。

## 基线与边界

- 分支：`feat/narrative-kernel`
- 起始及当前 HEAD：`55c08029051b11e9687d869747907e20291940fa`
- 写入前核对 `output/pm/NR-05-R1/pm-candidate-files.json`：60/60 匹配，0 缺失，0 不一致；`pm-candidate-source.json` 含 59 个产品/测试文件的完整原文，并含修复前 `archiveRoute.ts`。
- 产品写入仅 `apps/landing/src/lib/archiveRoute.ts`；测试写入仅卡片授权的 `archive-room-entry.spec.ts` 与新增 `archive-seek-layout.spec.ts`。
- 既有未提交改动全部保留；没有写入 PM 未授权的 `archiveRuntime.ts` 或 `ScrollIndicator.tsx`。

## 根因与实现

R2 的间歇失败来自像素落点在 `ScrollTrigger.refresh()` 后失效：hash 已更新为目标章，但最终 `commitPosition` 会按刷新后的 `scrollY` 重采样，偶尔仍落在上一个 bridge。

修复把路由目标改为可重建的语义意图：

1. 物件打开/RETURN 传递 `{ segment, progress }`，每次都用当前 `SampleLayout` 换算像素，不复用刷新前的旧 top。
2. 正文、Frame 深主题及 Work 子项目仍走 `scrollToChapterRaw`；首次落位后 refresh，再按新布局和同一请求重落一次。
3. 最终提交前验证实际 `positionAtScroll` 是否属于请求的 reading segment，或是否满足物件语义位置及进度容差；只允许同一 request ID 在未取消时修正一次并复验，失败则返回 readable fallback。
4. 右侧 `ScrollIndicator` 原本不像顶部 `Nav` 那样保存离开章书签。本轮没有扩大组件边界，而是在统一 sample 路由入口中，仅当当前位置确属 reading segment、请求要求 restore、且不是物件/RETURN 时记录当前章节。这样所有真实入口共享同一书签语义，且 bridge、RETURN 与后发请求不会覆盖旧书签。
5. hash 只在第一次落位时更新；refresh 后重落不重复写 history。

## 浏览器回归

系统 Chrome，正常生产模式、自有端口，无 diagnostic/hardware 覆盖：

| 检查 | 结果 |
| --- | --- |
| `archive-seek-layout.spec.ts`，端口 4380 | 3/3 passed（主路径） |
| Life 真实物件快速点击 6 次 | 6/6：`elementFromPoint` 为 Life，click/request 均到达，hash `#life`，最终 `life-reading` 且 Life 非 inert |
| Contact→About 长文书签→RETURN→再开 | 书签、普通回访、RETURN 后再开均为归一化 `0.9451923076923077`，最终 `about-reading` |
| refresh 阶段连续 Frame→Stack | 后发 `#skills` 获胜，最终 `stack-reading`；Frame inert、Skills 可读 |
| refresh 阶段真实 wheel 取消，端口 4382 | 1/1 passed；捕获 `archive-request-start → wheel`，最终不被旧请求拉回 `contact-reading` |
| Frame 深链 / Work 子项目 offset | `#frame-cuisine` top `39.890625px`；EduCanvas top `71.765625px`，最终 `work-reading` |
| `archive-room-entry.spec.ts`，端口 4381 | 2/2 passed，原 About→Life 反例及六个共享入口均通过 |

一次合并回归中，旧共享入口测试在正文刚解除 inert、路由打开动画尚未清理时立即用脚本滚去下一个 bridge，收到上一请求的合法最终落位，导致 1 条失败。测试改为观察 `.archive-route-layer` 已清理后再开始下一条独立入口探测；没有增加 sleep、force click、手工 memory 或产品绕行。修正后该文件 2/2 通过。

原始读回见：

- `output/pm/NR-05-R3/rapid-life-clicks.json`
- `output/pm/NR-05-R3/navigation-intents.json`
- `output/pm/NR-05-R3/subtarget-offsets.json`
- `output/pm/NR-05-R3/user-cancel.json`
- 诊断阶段保留 `about-bookmark-inspection.json` 与 `about-bookmark-debug.json`，未删除初始失败证据。

## 静态检查与清理

| 检查 | 结果 |
| --- | --- |
| `npx tsc -b --pretty false` | exit 0 |
| 3 个受影响 TS/测试文件 ESLint | exit 0 |
| `npm run test:build:architecture` | exit 0 |
| `npm run test:build:loader` | exit 0 |
| `git diff --check` | exit 0 |

构建仍报告候选既有的 `mediaCache.ts` ineffective dynamic import 与大于 720 kB chunk 提示；没有新增错误。DEV 自有 4378—4381 端口均已无监听；tim 的 5173 仍由原 PID 53714 监听，本轮未触碰。

## 剩余边界

- DEV 在本报告与候选证据生成后停止产品写入，等待 PM 冻结。
- QA 仍需按最新卡完成真实连续旅程，尤其 Contact→About 长文、RETURN 后再开、快速 Life 点击与导航抢占。
- 本轮未进入视觉精修、发布、提交或推送。
