# VR-02B · About捕获效果的真实阅读启用

PM_ACCEPTED_IMPLEMENTATION · ARCH已完成停止；6文件快照output/pm/VR-02B/pm-accepted.json，PM独立13项定点检查通过。最终集成与独立QA待完成；本卡下方为已执行记录，不再据此续写。

## 授权写入范围

仅apps/landing/src/components/About.tsx、components/effects/AboutDecryptReveal.tsx、components/effects/CanvasUiHtmlSurface.tsx，必要紧邻的小型启用条件辅助模块/非浏览器测试；报告docs/pm/reports/VR-02B-delivery.md及output/pm/VR-02B/。不得写PersonalArchiveBridge、ArchiveAbout、runtime、路由、模型、样式、其他效果vendor、配置。其他模块只读；开始保存完整原文/哈希并确认无其他修改，勿还原他人代码。

## 实现目标

修复About.tsx只mobile/reduced才enabled但surface恰好排除二者的确定矛盾。真实About阅读时可启用Decrypt，preview/转场副本不启用；移动、reduced、无能力、无资源正常保留DOM。

不能只删除mobile条件就完成：ArchiveAbout传入reading来自entry桥接完成标志，离开About或路由变形时可能仍为true。根据当前真实正文是否inert、不可见、处于路由交接等可靠状态关闭增强；优先复用实际语义DOM状态和现有生命周期，不读取诊断records、不新增世界时钟或改桥接所有权。观察器应有界、可清理、迟到ready不能复活。

只修有证据的surface生命周期问题。确保真实可用首帧前保留原DOM，失败/取消/销毁/上下文丢失恢复内容并释放资源；不通过强制supported、伪首帧或隐藏正文提高开启率。不要顺手修vendor完整性历史问题。

## 验证与交付

定点非浏览器条件/生命周期检查，限定lint/类型检查；不写共享dist/tsbuildinfo，不运行全应用build/全测试，不启动服务/浏览器/Playwright/截图。不能用布尔镜像测试冒充真实HTML捕获验证，明确前端NOT_RUN。

完成报告根因、实际变化、检查证据、完整候选原文/hash与未验证边界，停止通知PM。VR-02A配置已接受保持不动；不续其他卡，不提交/推送/发布。DEV与PM之后串行最终全应用构建。
