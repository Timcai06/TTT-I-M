# NR-Q05-R3 · 导航刷新修复与全站闭环

**READY，2026-09-10 PM已冻结并正式派发。** 当前QA模型不变，产品只读。

保留R1命中FAIL、R1修复通过、R2点击后正文FAIL及后续真实事件定位。R2稳定点击成功仅证明该次成功；DEV无诊断正常模式6次中2次click已送达但commit旧段，不能因一次成功关闭。

待新候选冻结后，重点验证：

1. 正常生产无diagnostic/hardwareoverride的快速Life物件真实点击，事件target、当前request/hash、最终life-reading/inert=false一致；复现旧条件的数次独立重复，不能通过固定长延时掩盖错误落点。
2. 一次正常启动、不reload/reset的真实全站旅程：Index→About长文→RETURN物件→Life→Frame深主题Cuisine07/07→Stack→Work真实案例开关→Contact两CTA→全局About长文书签恢复。读数可等待真实滚动/布局稳定，操控不可直接T/路由/sample、force或注入事件。Frame需真实主题入口或真实滚动，不假设全局Frame直接是Cuisine。About书签记录在滚动稳定后。
3. RETURN到物件不被误纠回正文，再打开回原书签；新请求/用户取消在refresh期间可赢，无旧回调改写落点。仅重复与本修复相关部分，不重跑已过全资产/全单测。
4. PM独立静态检查作为补充，QA要当前浏览器证据。产品前后指纹一致，截图不改样式。保存准确命令、退出码、事件/请求/语义位置读回与原失败对比，不把测试脚本超界/过早读取或成功的一次解释为全部通过。

报告 `docs/pm/reports/NR-Q05-R3-navigation-closure.md`，证据 `output/pm/NR-Q05-R3/`。系统Chrome/自有空闲端口，保护5173，清理被中断的自有服务。必要新产品缺陷立即给确证；所有要求通过再PASS并停止，PM最终技术接受。视觉精修、最终收尾发布等待tim。


补充：记录长文书签时，除滚动稳定外，要确认About仍非inert、真实最后阅读文本在视口，不能把已滚入About→Life handoff且DOM比例被clamp成1的位置当“About阅读书签”。记录该时刻真实scroll与正文状态，后续同视口恢复应保留对应内容位置。QA所用“Scroll to ABOUT/CONTACT”来自ScrollIndicator而非顶部Nav，原入口未调用remember；DEV当前需在统一请求入口解决，不允许测试主动写memory补齐。


## 冻结候选

- `output/pm/NR-05-R3/pm-candidate-files.json`：61文件，PM独立61/61一致，覆盖上轮全部60文件。
- `output/pm/NR-05-R3/pm-candidate-source.json`：60完整文本原文，PM核原文/哈希一致。
- DEV已停止产品写入；改动仅archiveRoute.ts、room-entry e2e及新增seek-layout e2e。见 `NR-05-R3-delivery.md`，正常无诊断Life快速6/6、3个主路径/子目标/后发请求、真实wheel取消1/1、入口2/2，必要静态通过；这些是DEV证据，QA需独立复核重点。
- 统一route仅在真实reading位置、restore请求且非RETURN/物件时保存书签；原书签记录入口缺失已补。RETURN按StoryPosition重建而非旧像素，布局refresh后重落和提交前验证均受当前请求约束。
- 独立入口之间需观察上一`.archive-route-layer`已清理，避免脚本程序跳动被上一尚未完成的合法路由落位影响。真实全站旅程仍允许用户取消/新请求，不把自然取消当新缺陷。

完成后停止，真实连续流程与反例全部闭合才能PASS，PM将核原始事件/截图/指纹后最终接受。
