# VR-03 · 兼容旧效果的局部接入

最终状态：ACCEPTED_TECHNICAL，见../reports/VR-pm-acceptance.md。执行会话已停止；下文保留历史派发范围与返工记录。
PM_FROZEN_PENDING_QA · 24文件已冻结于output/pm/VR-03/pm-frozen.json；DEV停止。下文保留派发记录。

DEV，2026-09-10 PM正式派发，沿用当前模型。VR-01、VR-02A、VR-02B均已接受实施候选并冻结；ARCH停止。DEV恢复唯一产品写入者。

接受基线：output/pm/VR-01/pm-accepted-files.json（24文件，22完整文本及2二进制）；output/pm/VR-02A/pm-accepted.json（5文件）；output/pm/VR-02B/pm-accepted.json（6文件）。先校验，读取当前新surface接口，勿退回老版本。PM已独立完成核心几何复核与配置9/捕获13项定点测试。

tim希望此前HTML-in-Canvas效果正式域名仍可见。PM已询问局部保留与仅保留当前效果两种范围；在没有进一步答复前，按已向tim说明的“兼容局部增强、不恢复旧入口”准备本卡。若用户选择仅当前效果，本卡取消，不实施。

读docs/pm/reports/VR-02P-local-effects-map.md作为代码线索，不能当已验证方案。DEV唯一产品写入，保留VR-01/02冻结成果，修改前保存当前完整原文。

## 可感知结果与边界

- Contact：恢复章节背景内局部指针Liquid，和旧iris开关分离；限制Contact背景区域、在正文下面、pointer-events:none，离开/路由/隐藏/销毁清除。此效果captureContent=false，不宣称它依赖HTML-in-Canvas。移动/reduced与资源不足正常降级。
- Work：保留Laser视觉为真实Work阅读区的局部非交互光缝/标题增强；启用与空间阅读状态一致，不恢复旧CTA锁门、portal或独立滚动段。HTML捕获无首帧时保留原内容；与Glass避免重复抢同一区域。若将扫光位置绑定阅读进度，现有setScrollActivity忽略progress必须修正，不能假称已受控。
- Frame：保留局部粒子视觉语言在非照片、非交互的阅读标题/装饰区；不重新将已绑定的真实照片复制成另一张全屏消散图，不覆盖Life→Frame真实照片转移。明确这是局部适配，不宣称原整照片消散完全复原。绑定滚动的消散进度应绝对受控，不补播跨章intro；局部装饰噪声不必被升级为世界状态。

优先复用现有阅读状态接口；确有必要时新增成功提交后的轻量只读订阅。不能读取诊断records/dataset充当生产总线，不新增世界时钟/滚动所有者。订阅首个监听/异步ready应可读取最新值，消费者异常隔离；旧请求/布局/资源代次和失败/销毁变inactive，不复活旧效果。不要为三个装饰效果建立庞大调度框架。唯一世界状态规则不禁止局部装饰的有界动画或指针瞬态；不用为噪声像素相等改写vendor，避免旧文档推断限制本次合理实现。

VR-02B已经示范读取实际正文inert/祖先可见性与html routing状态，并提供surface的isCaptureAllowed资格回调。可参考它为局部效果判断真实阅读；这些语义DOM状态与诊断records不同，不必因此新增runtime总线。保留About专用逻辑，不为抽象而重构它。

## 技术验证与交付

可写：上述三个局部组件/对应挂载与样式、canvas-ui包装和必要vendor受控模式、紧邻现有runtime的只读订阅（若确需）、相关单元/构建守卫。不得修改相机/真实照片模型/路由落点取得效果成功。任何vendor变更记录来源和更新完整性清单的具体差异，既有Decrypt vendor问题单独报告，不混成全绿。

非浏览器检查：受控参数乱序/重复一致；inactive/取消/迟到ready不复活；清理订阅/资源；异常不影响主运行时；正文交互属性不由装饰效果修改。完整类型检查、增量lint、build及相关守卫。用户亲自做前端检验与效果测试，本卡不运行浏览器/Playwright/截图、不启动服务。

只跑本卡相关单元检查和最终集成build，不无意义重复已接受几何全套。尤其archivePhotoTransfer.test会写旧PM证据目录，如因真实变更必须重跑，应隔离其输出工作目录，不覆盖NR-03/VR-01历史证据。普通样式不写镜像测试。旧实验e2e断言若被本次明确替代可更新，但标记NOT_RUN。

输出docs/pm/reports/VR-03-delivery.md和output/pm/VR-03/完整基线/候选/检查证据。逐效果写清实际位置、变化与降级，前端表现NOT_RUN。完成停止，PM冻结后交QA非浏览器复核。未经授权不提交/推送/发布。

## PM补充：已审阅的Decrypt登记修复

上文“既有Decrypt问题单独报告”的范围现由具体审阅补充：见[来源审阅](../reports/VR-02B-vendor-provenance.md)。PM已逐段核对两笔既有本地提交，允许DEV确认Decrypt源码仍为f59883071a44403f667f55eef8089628e9a7de28e79b9988de63561220944b1d后，仅同步integrity.json登记并记录两笔本地修复来源；保留上游revision，不修改该vendor源码、不放宽守卫。QA最终审查核对实际hash与完整性检查结果。本授权不涵盖其他未经审阅的vendor漂移。
