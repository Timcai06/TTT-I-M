# NR-05-R1 · 房间入口真实点击层级修复

**READY，2026-09-10 PM 派发。DEV 沿用 tim 当前模型/推理设置，唯一产品写入者。**

## 真实缺陷与基线

NR-Q05 主体专项通过；NR-Q05-R1 单页真实旅程发现 About→Life 的可见 `button[aria-label="打开 life"]` 无法正常鼠标点击，Playwright 重复报告 `.archive-bridge__stage intercepts pointer events`。按钮 visible/enabled/tabindex0。此前固定wheel越过Life是脚本问题，已由 scroll5399–6100 Life非inert证明，与本真实点击缺陷分开。

读 `docs/pm/reports/NR-Q05-R1-real-user-journey.md` 和 `output/pm/NR-Q05-R1/qa-real-user-journey.spec.ts`、失败context。当前产品候选 `output/pm/NR-05/pm-candidate-files.json` 59文件及 `pm-candidate-source.json` 58完整原文；修复前先核哈希，新增范围如CSS未在候选内须另存完整原文+hash。不得回滚此前开发。

## 写入范围

`apps/landing/src/components/personal-archive/` 内：
- `personal-archive.css`
- `archiveReadingSurface.ts`
- `ArchiveChapterBridge.tsx`
- `PersonalArchiveBridge.tsx`
- `ArchiveStage.tsx`（仅如确由持久舞台命中层导致）

必要真实点击回归可新增 `apps/landing/tests/e2e/archive-room-entry.spec.ts`。只改导致此缺陷的最小子集；报告 `docs/pm/reports/NR-05-R1-delivery.md`，证据 `output/pm/NR-05-R1/`。不改GLB、内容、镜头、色彩、布局节奏、资源政策、依赖或旧测试来掩盖失败。

## 要求

1. 复现并确认是哪一个舞台/遮罩在按钮位置拿到真实命中，区分当前舞台与相邻 sticky 舞台，读取 computed pointer-events/z-index/visibility 与 elementFromPoint；不要仅凭错误字符串盲加全局z-index。
2. 正常真实点击可见物件入口能进入正确章；只允许当前交互owner接收输入，隐藏/非当前舞台不得挡住；正文、导航、返回、footer退路、Index保持可操作。不可force click/DOM click或隐藏遮罩式测试绕过。
3. About→Life 原反例必须通过；抽查其余共享入口（Frame/Stack/Work/Contact及entry）避免只修Life选择器。不要恢复旧world/session/camera writer。
4. 跑完整tsc-b、受影响lint/守卫及必要真实浏览器点击回归；原失败保留，记录修复后准确结果。无需重复51/162整套单测。
5. 新候选变更/保护清单+原文快照，停止产品写入交付PM。系统Chrome/自有空闲端口，清理中断自有服务，保护5173。

完成后由QA原失败路径及完整连续用户旅程验收，不替用户视觉验收，不提交/推送/发布。


**PM最终状态（2026-09-10）：本卡已关闭。** 全站技术推广已接受，见 `docs/pm/reports/NR-05-pm-acceptance.md`；历史READY为派发记录，不能据此重启。视觉精修、最终收尾与发布等待tim新指示。
