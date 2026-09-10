# VR-03-R1 · Frame与Work静态标题捕获

最终状态：ACCEPTED_TECHNICAL，见../reports/VR-pm-acceptance.md。执行会话已停止；下文保留历史派发范围与返工记录。
IN_PROGRESS · DEV，沿用当前模型；QA只读报告后停止，待修复冻结。

基线output/pm/VR-03/pm-frozen.json。QA确认真实标题的revealWordsOnce为.word写opacity/transform/filter，cloneNode可能将初始隐藏状态固定在捕获副本；ParticleScroll又将任意paint当成功。当前原标题保持显示，不声称已经丢失语义正文；缺陷是空白增强误ready与效果缺失。

只改FrameTitleParticles、必要紧邻capture helper及定点tests、ParticleScroll adapter/vendor与对应integrity登记；其余冻结。静态捕获需保留文字排版，清理揭示专属瞬态，不改真实标题。有效像素必须参与ready握手；空白/失败保留原文，迟到回调与清理仍不复活。不能用强制支持或忽略错误通过。

针对性非浏览器测试覆盖初始隐藏词/静态副本隔离、空白捕获不ready、有效像素后ready及迟到回调。增量lint、完整build和相关guards；不跑浏览器、不启动服务、不提交推送。

输出docs/pm/reports/VR-03-R1-delivery.md、output/pm/VR-03-R1/完整基线/候选/验证。完成停止，PM冻结后QA定点复核。

## PM追加的Work引用修复

ARCH报告VR-03-work-capture-audit.md确认Laser克隆删除mask id却保留url引用，且复制一次性wipe瞬态。扩展白名单仅laser.ts及紧邻helper/tests：克隆已有SVG id使用每实例唯一命名空间，同步本地片段引用；只归一化捕获副本中MaskedHeading的stage揭示状态与稳定media scale，保留原文与原全局动画。不要删除mask或依赖原DOM定义，不建立泛化克隆框架。测试自足引用、同页多克隆不冲突、原节点不变、初始wipe捕获为静态可读。可与Frame R1共用最终build/guard，报告清楚分别覆盖的文件。
