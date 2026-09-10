# VR-02P · HTML-in-Canvas正式域名兼容性只读核对

READY · ARCH · 2026-09-10，沿用当前配置模型。

tim要求此前HTML-in-Canvas效果部署到正式域名后仍能看到且避免问题。本卡只读实现/配置与官方文档核对，不改产品，不浏览前端/跑效果测试，不部署。DEV同时唯一写入VR-01空间/配色范围，勿干扰。

检查当前apps/landing/config/htmlInCanvasOriginTrial.ts、vite配置、CanvasUiHtmlSurface、canvas-ui/runtime与调用方、构建/部署说明、环境变量示例及现有实验测试；核对真正哪些效果还在生产路径、哪些只在实验flag下可见。检查浏览器/安全上下文/Origin Trial是否仍需要、token对应origin/到期/功能名、正式域名与www/preview差异、字体/图片跨域、首帧失败/上下文丢失/不支持时内容降级与可点击性。

必须查当前官方Chrome/Chromium文档，精确区分已查证事实、实现问题与待正式域名验证。不要把token字符串格式验证当作有效签名或可用性证明。不要读取打印无关秘密；token属公开meta但也不输出原值。无域名/合法token不能凭空制造或承诺所有浏览器完全相同效果；提出可执行最小修复与用户最终需提供信息。

输出docs/pm/reports/VR-02P-html-canvas-audit.md，含证据文件定位、官方链接、按优先级具体建议、可写入文件建议及非浏览器测试计划。不要写长篇通用指南。完成停止并通知PM；此时不运行测试/服务、修改源或自行续卡。
