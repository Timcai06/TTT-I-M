# NR-Q05-R4 · Contact 媒体退出定点复核

**READY，2026-09-10正式派发。QA当前模型不变，产品只读。**

NR-05-R4没有产品/官方测试修改；PM再次独立核NR-05-R3候选61/61一致，仍使用 `output/pm/NR-05-R3/pm-candidate-files.json` 及60完整文本快照。DEV已停止。

R3全站真实旅程、快速Life、准确书签/RETURN/取消已独立通过；唯一未闭合为Contact截图片段。DEV已确证来源为 `.case-image-transition > img`（src /projects/educanvas/home.webp），不是room canvas或透明复制层；Escape后dialog约49ms消失、Contact/route约195ms完成，但case-collapse到约850ms才完整移除。最终标题/CTA无遮挡；回Work还能正常打开关闭同一案例。PM已实际查看最终无遮挡图。

只需一条独立短流程：正常生产Work真实案例打开→Escape关闭→进入Contact；记录body.dataset.caseImageTransition及.case-image-transition数量（以及route/dialog/particle相关退出标识），等待真正有限退出完成，再确认标题/两个CTA无遮挡且命中各自真实控件，不激活外链；保存未改样式截图。随后回Work确认同一媒体/案例可用并关闭全清。可复用DEV `output/pm/NR-05-R4/contact-media-lifecycle.spec.ts` 方法，但QA运行独立输出，勿覆盖DEV证据。

无需重跑全站旅程、GPU、资产、静态或全部测试；源文件没有变化。记录准确命令/退出码与生命周期证据，核61指纹，清理自有端口，保护5173。

报告 `docs/pm/reports/NR-Q05-R4-contact-lifecycle-recheck.md`，证据 `output/pm/NR-Q05-R4/`。保留R3早截FAIL报告，以本补证修正“稳态遮挡”归因。通过后停止，并明确NR-Q05整体技术闭环已通过（现行资源政策下两旧冲突仍不记通过）；视觉节奏接受交tim。


**PM最终状态（2026-09-10）：本卡已关闭。** 全站技术推广已接受，见 `docs/pm/reports/NR-05-pm-acceptance.md`；历史READY为派发记录，不能据此重启。视觉精修、最终收尾与发布等待tim新指示。
