# NR-Q02-R1 · 恢复缺陷定点复核

**READY，PM 已冻结 NR-02B-R1 候选**。QA / Sol high，产品只读。清单为 `output/pm/NR-02B-R1/pm-candidate-files.json`；同分支/HEAD，2个授权文件变化、36个不变，由PM逐项独立核对。DEV已交 `NR-02B-R1-delivery.md` 并停止。

复用 NR-Q02 已完成的正常和全22项证据，不重跑整套。先确认新候选指纹，再重验原 `QA transient projection recovery` 反例：故障时隐藏画布/正文可读；恢复原尺寸并完成新布局后，原 life-frame 合法中点恢复实际动作/相机/DOM和可用hit，再导航 About/Life 产生最新请求提交、正文可交互。不能用整页reload或GPU loss清错误。检查原桥不残留永久 failed/卸载。

另复跑一次正常书签返回与已有真实 GPU 恢复中换请求路径，确认定点修复没有破坏它们。若 DEV 新回归已覆盖原桥及另一章，可直接复用新用例并独立保留原 QA 浏览器夹具的复现；不追加广泛变体。

仅写 `docs/pm/reports/NR-Q02-R1-recheck.md` 和 `output/pm/NR-Q02-R1/`，不覆盖旧QA失败证据，不改产品/既有测试/DEV证据。原配置、系统Chrome、空闲非5173端口；检查后清理自有服务，记录源码前后指纹、命令/退出码和PASS/FAIL/NOT_RUN。报告完成后停止，视觉精修和最终收尾不在本卡。
