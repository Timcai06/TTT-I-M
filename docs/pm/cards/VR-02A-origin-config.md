# VR-02A · 正式域名试用配置校验

PM_ACCEPTED_CONFIG · 2026-09-10。ARCH已完成并停止，恢复只读职责；最终全应用构建待串行验证。接受快照output/pm/VR-02A/pm-accepted.json（5文件），PM独立9单测通过。下列为已执行卡片记录，不再据此续写。

这是PM按workflow“互不相交模块可显式分配”允许的例外：DEV继续VR-01，仅ARCH写以下配置文件。该卡显式覆盖ARCH通常只读的范围约定；其他产品源码仍禁止写。此前VR-02P只读卡已完成。

## 唯一写入范围

- apps/landing/config/htmlInCanvasOriginTrial.ts
- apps/landing/tests/htmlInCanvasOriginTrial.test.ts
- apps/landing/vite.config.ts（仅本插件参数接线，确有必要时）
- apps/landing/.env.example
- docs/html-in-canvas-deployment.md
- docs/pm/reports/VR-02A-delivery.md 与 output/pm/VR-02A/

你并非独占仓库，不还原DEV的改动。不得写About、效果组件/vendor、runtime、模型、其余测试、看板或其他报告。DEV也不得写本卡列表。初始保存这些文件完整原文+hash，报告目前分支HEAD。

## 具体实现

按VR-02P已确认事实，www.crt-dsg.com为最终origin，当前线上公开token字段匹配；保留已有token注入机制，不抄线上token进库，不改任何远端环境或发布。新增有界公开token payload解析、feature/origin/expiry诊断：损坏/错误功能/显式origin不匹配要有可定位消息且不回显原token；不能把结构检查当签名验证。过期不能静默称可用，选择明确的构建诊断政策，并保留本地/Preview无token时正常DOM降级构建。试用过期与后台Valid Until不同；生产目标origin应明确可配置或来自已有canonical配置，不能将所有Preview强当www生产。

支持真实v2/v3 token结构，大小/编码/JSON/字段校验有边界，错误消息不泄露原token；仅验证Chrome公开payload支持范围，不造签名校验。初始HTML仍在应用能力检测前注入。不要把runtime supported强置true，不需新插件依赖。

简短部署说明包含当前www跳转事实、已有环境变量、配置修改后需获准部署才生效、普通目标Chrome确认token有效/能力/首帧和不支持浏览器DOM降级。注册续期与正式发布由tim控制。

## 验证与交付

执行本模块边界单元测试、仅白名单lint/必要类型检查。DEV可能同时构建，本卡不要写共享dist/tsbuildinfo，不运行全应用build或测试全部。可用独立临时outDir验证插件初始HTML转换；最终全应用build由DEV/PM串行执行。不得启动服务、浏览器、Playwright、截图或效果测试。

报告准确结果与未运行边界、完整候选原文和hash、无需用户手动补代码。完成停止写入通知PM。不要续VR-02/03，不提交/推送/部署，不打印实际token。
