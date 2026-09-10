# NR-05-R3 · 布局刷新后的导航目标提交

**READY，2026-09-10 PM授权DEV修复。沿用当前模型/推理设置。QA已明确停止旧候选测试，DEV唯一产品写入者。**

## 确定问题

基线为 `output/pm/NR-05-R1/pm-candidate-files.json` 60文件，完整文本 `pm-candidate-source.json` 59文件。先核对，受修改源完整原文已包含，不得回滚此前工作。

读 `NR-05-R2-click-navigation-diagnosis.md` 与 `output/pm/NR-05-R2/click-navigation-evidence.json`：正常无diagnostic/hardware覆盖，6次真实Life物件点击有2次捕获click target=Life、request-start=1、hash=#life，最终却sampleOwner=about-life/Life inert。不是单纯点位过时；稳定点击偶尔成功不能闭合。QA独立全站旅程已通过Index→About→Life→Frame Cuisine07/07→Stack→Work案例→Contact，但Contact点全局About末步10秒仍inert，需一起纳入最新目标导航回归。

已读代码：seekArchiveChapter先raw跳转、再ScrollTrigger.refresh，最终commitPosition忽略targetId按当时scrollY重采样。刷新后布局/落点变化可使已更新hash的请求仍提交前一个bridge。修复需确保提交的实际位置满足当前请求意图。

## 最小写入范围

- `apps/landing/src/lib/archiveRoute.ts`
- `apps/landing/tests/e2e/archive-room-entry.spec.ts`（正常生产模式原路径/重复回归）
- 可新增 `apps/landing/tests/e2e/archive-seek-layout.spec.ts`（必要时集中新布局导航回归）
- 报告 `docs/pm/reports/NR-05-R3-delivery.md`，证据 `output/pm/NR-05-R3/`。

如确需改接口其他生产文件，先说明具体原因供PM扩边界；不预先全仓改。

## 约束与验收

1. refresh后按当前layout和当前请求意图重算目标落点，并在最终commit前验证目标语义。不能用120/520/1100定时重跳、盲sleep、force click或永久纠偏循环取得通过。任何二次落位仍受同一request ID/cancel/layout代次约束，旧请求不得回写。
2. **区分打开正文与返回物件**：正文应进入目标reading segment/既有书签；`returnSource/top`必须保留目标物件bridge的语义位置，不能把RETURN强行纠回正文。刷新后需要重建的是语义目标，不能复用失效像素top。
3. 保留About长文、Frame深主题/末簇、Work子项目offset、浏览器hash/history及书签。不能简单把所有目标归零首屏；不得重复污染history。Index、Contact物理p0、narrow/reduced/空间failed阅读fallback保持。
4. 正常模式无diagnostic/hardware覆盖复验原快速真实Life点击；保留可信事件target、request/hash、scroll/实际sampleOwner及inert。至少覆盖能暴露间歇的同类多次点击，初次失败证据不删。回归Contact→About长文书签、RETURN物件后再开、新请求或用户取消在refresh阶段胜出。测试时等待读数稳定可用于观察，不可用测试等待掩盖旧请求错误提交。
5. 完整tsc-b、受影响lint、architecture/loader守卫和diff；定点相关浏览器即可，不重复全部纯采样/资产测试。
6. 新变更/保护指纹、完整原文快照，准确报告实际命令/失败与修复后结果；停止产品写入，PM冻结后QA完成真实连续旅程。系统Chrome/自有空闲非QA端口，保护5173并清理自有服务。

不进入视觉精修/最终收尾/发布，不提交或推送。


**PM最终状态（2026-09-10）：本卡已关闭。** 全站技术推广已接受，见 `docs/pm/reports/NR-05-pm-acceptance.md`；历史READY为派发记录，不能据此重启。视觉精修、最终收尾与发布等待tim新指示。
