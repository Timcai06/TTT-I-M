# VR-02 · HTML-in-Canvas可达性与正式域名配置

DECOMPOSED · 2026-09-10。本卡为范围总览，不直接派发：配置拆至VR-02A（已接受），About捕获生命周期拆至VR-02B（ARCH独立白名单实现），后续兼容局部效果为VR-03（DEV在空间与捕获模块冻结后执行）。沿用现有模型。

## 已确认事实

读docs/pm/reports/VR-02P-html-canvas-audit.md。正式域名crt-dsg.com的初始HTTP响应307跳转www.crt-dsg.com；公开token payload origin=https://www.crt-dsg.com:443、feature=HTMLInCanvas、expiry=2026-10-20 00:00 UTC。不输出/硬编码token，不修改远端环境、GitHub绑定或发布。payload校验不能证明签名或试用注册有效。

当前About只在mobile/reduced启用，而CanvasUiHtmlSurface排除mobile/reduced，Decrypt不可达。Glass、Bend有生产入口。旧Frame粒子、Work Laser、Contact Liquid入口已被空间架构替换；是否融入局部增强等PM发卡时的用户范围答复，不能恢复旧CTA锁门或覆盖空间叙事。

## 必做范围

1. 修复About Decrypt生产路径的启用矛盾，绑定真实阅读状态，并与空间交接互斥；正确支持降级，保留正文语义/输入/书签。不要求移动或reduced-motion强开效果。
2. **已拆至VR-02A并经PM接受配置交付**：ARCH完成有界公开payload校验、canonical/Preview目标区分与部署说明；现有Production只TOKEN兼容，无需新增远端变量。冻结output/pm/VR-02A/pm-accepted.json，5文件，PM独立9单测通过。DEV本卡保留这些成果，只在最终全应用构建时做集成检查，不重复实现配置解析。
3. 审查当前surface的首帧/失败/销毁/上下文丢失，修复有证据的缺陷：原DOM不能在真实可用首帧前消失；失败/取消/迟到回调正确清理，阅读和点击保留。没有缺陷时不重构已有成熟机制。
4. 更新简短域名部署说明，列出https://www.crt-dsg.com最终origin、现有环境变量、试用注册有效期与浏览器支持边界。不承诺所有浏览器相同效果。正式页面验收与注册续期由tim控制；本轮不部署、不改远端配置。

## 所有权、技术检查与交付

VR-01冻结后DEV仍唯一产品写入者；保存本卡原文基线。主要范围About.tsx、对应阅读状态接口、canvas-ui runtime/surface的确证缺陷、config/htmlInCanvasOriginTrial.ts、vite.config.ts（必要时）、相关测试、.env.example与部署说明。额外局部效果接入以派发补充为准。

运行token边界条件/有效结构/错功能/错origin/过期/损坏/无原值泄露的必要单元测试、完整tsc-b、增量lint、build与相关守卫；不为普通样式写镜像测试。可检查构建初始HTML产物，不启动服务、浏览器/Playwright/截图或效果测试。实验e2e历史断言与新生产结构不符时更新具体过时约定并明确NOT_RUN，不拿flag测试证明域名生效。

交付docs/pm/reports/VR-02-delivery.md与output/pm/VR-02/原文/候选/验证证据。逐项区分已修复、技术检查、tim待验效果、外部试用条件；完成停止通知PM，等待独立QA非浏览器审查。
