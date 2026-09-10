# VR-02P · HTML-in-Canvas 正式域名只读核对

```yaml
task_id: VR-02P
card_version: 1
status: DELIVERED
thread_id: 01a08483-8c0c-7fd0-b1a5-9ecc926e4f30
model: 当前会话配置，未覆盖；精确型号不可读取
reasoning_effort: 当前会话配置，未覆盖
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: 本次只读 git status 输出；已有大量迁移修改，DEV 同时执行 VR-01，未另写快照
changes:
  files: []
  report_file: docs/pm/reports/VR-02P-html-canvas-audit.md
acceptance:
  - id: 实现与官方条件核对
    result: PASS
  - id: 正式域名 HTTP 与公开 token payload
    result: PASS
  - id: 浏览器接受签名及效果
    result: NOT_RUN
checks:
  - command_or_action: rtk 只读源码、配置、状态及官方文档查询
    scope: HTML-in-Canvas 及实际调用链
    exit_code: 0
    result: PASS
    evidence: 本报告文件定位与官方链接；少量初始猜测路径不存在，已定位正确路径
  - command_or_action: Python urllib HTTPS GET 与公开 payload 解码
    scope: https://crt-dsg.com 和 https://www.crt-dsg.com 初始响应
    exit_code: 0
    result: PASS
    evidence: 下方线上观测，2026-09-10；未保存或输出原 token
unverified:
  - 浏览器 token 签名、注册后台 Valid Until、当前试用实际资格与绘制结果
  - Vercel 环境变量后台及线上版本与本地未提交候选的一致性
  - tim 对字体、图像、点击、恢复与效果的实际验收
risks_or_blockers:
  - token 条件满足不恢复当前调用链不可达的效果
  - 实验 API 与试用窗口仍有变动
scope_deviations: []
rollback: 产品只读；撤回仅删除本报告
cost:
  elapsed_minutes: unknown
  retries: unknown
  tokens_or_cost: unknown
recommended_next_action: PM 在 VR-01 冻结后串行派发最小修复卡；保留已存在的线上 token，先修可达性与诊断
```

## 结论与线上事实

**不是“正式域名没有配置 token”。** 2026-09-10，经 PM 补充授权仅获取 HTTP 头及初始 HTML：`https://crt-dsg.com` 返回 **307 → https://www.crt-dsg.com/**，最终 **200 / Vercel**；直接访问 www 也为 200。两次最终响应均解析出一个 Origin Trial token（响应头与 meta 合并计数）。公开 payload：

| 字段 | 结果 |
| --- | --- |
| origin | `https://www.crt-dsg.com:443` |
| feature | `HTMLInCanvas` |
| expiry | `1792454400`，即 **2026-10-20 00:00 UTC / 北京时间 08:00** |
| isSubdomain / isThirdParty | payload 未提供 |

最终页面 origin 与 token 的公开字段匹配，HTTPS 已具备；不需要为了用户输入裸域名而立即换成 apex token。若将来取消 www 跳转则必须重新核对；该 token 不覆盖任意 `*.vercel.app` Preview。解码不校验签名，不证明注册仍有效、浏览器接受或效果成功。GitHub 绑定只说明用户提供的部署关系，不能作为能力证据。

## 官方现状：不能沿用旧窗口，也不能承诺跨浏览器一致

- [Chrome 介绍文章](https://developer.chrome.com/blog/html-in-canvas-origin-trial)写的是初始 **148–150** 试用窗口，不能当作今天的最终期限。
- 本次直接读取 [ChromeStatus 官方 JSON](https://chromestatus.com/api/v0/features?q=HTML-in-canvas)，选中 feature `5172548013916160`：试用 ID `3478467762190286849`、功能名 `HTMLInCanvas`；2026-06-10 延期记录列 desktop_last **154**；2026-09-07 新延期请求列 **160**，且 `ot_action_requested: true`。**不能把请求中的 160 当作已经批准的可用窗口**，也不能把 desktop 延期套给 Android/WebView。顶层概括字段还显示 In development / origintrial false，与阶段详情粒度不同，不据此宣布试用结束。
- [试用注册页](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849)为 JS 页面，本次非浏览器读取未获得当前生效截止日期；最终窗口及注册 Valid Until 留待账号持有人确认。线上 payload 的 expiry 是其最晚到期字段，不等于已经确认了注册后台有效期。
- [Chromium 当前功能配置](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/platform/runtime_enabled_features.json5)仍把 `CanvasDrawElement` 标为 experimental，对应试用名 `HTMLInCanvas`。这不是已普遍开放的稳定能力。
- [Chrome 官方排障](https://developer.chrome.com/docs/web-platform/origin-trial-troubleshooting)区分签名、origin、有效期、浏览器版本、试用资格；Chrome token 不能据此承诺其他 Chromium 浏览器可用。不支持时应保留 DOM，而不是要求所有访客开实验 flag。

## 代码证据与真实效果范围

路径以下均相对仓库；结论针对当前本地候选，不推断线上已部署同版。

| 对象 | 当前实现与影响 |
| --- | --- |
| 构建注入 | `apps/landing/config/htmlInCanvasOriginTrial.ts` 仅验证字符/长度，head-prepend meta；`apps/landing/vite.config.ts` 从进程环境或 loadEnv 读取 `HTML_IN_CANVAS_ORIGIN_TRIAL_TOKEN`。构建时注入，不需 VITE_ 前缀；改环境变量需要后续获准重建部署。`data-feature=html-in-canvas` 只是自定义标记，不是 token 功能名。 |
| 环境约定 | `apps/landing/.env.example` 已明确 Production/www，符合当前 HTTP 跳转。无需新增第二套注入机制或硬编码 token。`vercel.json` 没有把所有浏览器变成支持实验 API 的配置。 |
| 能力门槛 | `src/lib/canvas-ui/runtime.ts:3` 检查 2D `drawElementImage` 和 canvas `requestPaint`。这是运行时能力检查；没有生产用 HTML_CANVAS_EXPERIMENTAL 环境开关。 |
| Horizontal Bend | `src/components/effects/HorizontalBendSurface.tsx` 与 `src/lib/canvas-ui/horizontalBend.ts:241` 是生产条件路径，桌面、正常动态、可见、资源租约及 API 具备时尝试增强。 |
| Project Glass | `src/components/effects/ProjectGlassSurface.tsx` 经 coordinator 选择单个 surface；Projects 调用受 glassReady / suppressed 等状态控制。属于当前可达的渐进增强，不是只在测试 flag 下存在。 |
| About Decrypt | **确定的可达性问题**：`src/components/About.tsx:106` 仅在 mobile 或 reducedMotion 时 enabled；`CanvasUiHtmlSurface.tsx:183` 又要求两者均 false。因此当前所有组合均不能增强。token 无法修复这一逻辑矛盾。 |
| Work Laser | `src/chapters/projects/useProjectsNarrative.ts` 依赖 Work handoff；唯一 dispatch 在 `src/components/WorkTransition.tsx:291`。`src/chapters/work-transition/ArchiveWorkTransition.tsx` 桌面正常模式使用 ArchiveChapterBridge。因此旧桌面 CTA→Laser 不再是当前正常空间旅程入口。不可直接恢复旧入口来“修 token”。 |
| Frame Particles | `src/components/frame/FrameParticleHandoff.tsx:56` 桌面使用空间 bridge；Legacy 仅 mobile/reduced 进入，而 Legacy 内又以同样条件 disabled。旧粒子增强路径不可达。 |
| Contact Liquid | `src/chapters/contact/useFooterReveal.ts:41` 空间 Contact 下 animated=false，因此 liquidActive=false；是空间交接与旧全屏效果的范围选择。不能算部署配置失败。 |
| 实验测试 | `apps/landing/playwright.config.ts:88` 的 HTML_CANVAS_EXPERIMENTAL=1 添加 CanvasDrawElement 启动参数；CI 对应 job 设置此变量。`tests/e2e/canvas-ui-experimental.spec.ts` 还断言旧 locked CTA、粒子 surface 等结构，不能证明当前正式路径。flag 通过也不证明 Origin Trial 生效。 |

上表 `src/`、`tests/` 简写均位于 `apps/landing/`。不把 WebGL 普通特效和 HTML DOM 捕获混为同一能力。

## 降级、资源和交互

`CanvasUiHtmlSurface.tsx` 已保留真实语义 DOM，捕获克隆 inert、aria-hidden、移除重复 ID/焦点；`src/styles/components/canvas-ui-surfaces.css:28` 输出 pointer-events:none，失败/延期隐藏输出。已有首帧非空探测、图片 decode 等待、工厂期限、2400ms 首帧期限、contextlost 降级与有界恢复，不能为了增强率删除这些门槛。这里确认的是实现机制，未实测点击或恢复。

非空 alpha 探测只证明“存在像素”，不能证明完整图片、字体或裁切正确。克隆同步 currentSrc、监听图像 load/error；不要将文字仍可见误认作跨域图片也成功。[WICG 当前提案](https://wicg.github.io/html-in-canvas/)限制不可读跨源数据进入可读画布，跨源 iframe 尤其不能按普通 DOM 捕获承诺。根 `vercel.json` 当前 CSP 的 img/font 主要限定 self；同源代理与 CORS 可读资源优先，不能用放宽整个 CSP 作为通用修复。

字体不是完全无等待：`src/lib/resources/loaders.ts:215`、`prepareChapterPages.ts:17` 与 `archiveRuntime.ts:99` 已等待 document.fonts.ready，main.tsx 注释说明同源字体。通用 surface 本身未监听后续字体集变化；如后续引入动态字体，仅补有界失效重绘，不再增加一个阻塞全站的 loader。当前 API 仍在调整，vendor 和 horizontalBend 的 drawElementImage 调用忽略返回值；不因旧博客 DOMMatrix 示例而要求重构交互克隆。实际点击仍由原 DOM 承担，其与视觉扭曲的偏差留给 tim 验收。

## 最小后续卡建议与可写白名单

1. **P1 / 恢复承诺前必须处理：About 可达性。** 若保留 Decrypt 产品意图，将 enabled 对齐 ArchiveAbout 的 reading（该组件已经传递 reading），让通用容器统一排除 mobile/reduced；避免与书页空间变形同时拥有视觉。最小允许 `apps/landing/src/components/About.tsx` 及针对条件的回归测试；不要顺便恢复 Legacy 粒子/全屏 Liquid/旧 CTA。恢复哪些历史效果由 PM/tim 明确后单独派卡。
2. **P1 / 正式兼容性诊断：保留当前 token，新增公开 metadata 检查。** 建议仅 `apps/landing/config/htmlInCanvasOriginTrial.ts`、`apps/landing/tests/htmlInCanvasOriginTrial.test.ts`、`.env.example` 与针对性部署说明；检查 feature/origin/expiry，错误只报原因不回显 token。生产明确配置 token 时对错误字段报清楚；无 token 的本地/Preview 仍允许 DOM 降级。标注结构检查不验证签名。后台续期与重部署不在本卡内。
3. **P2 / 失败原因可辨认。** 如确需定位，限 `src/lib/canvas-ui/runtime.ts`、`src/components/effects/CanvasUiHtmlSurface.tsx` 与其现有测试，区分 unsupported、资源等待、首帧失败、contextlost、租约延期。不要把 supported 强行返回 true，不增加新的渲染状态所有者。动态字体监听仅有复现需求时补。
4. **P2 / 修正测试承诺。** 后续只修改 `apps/landing/tests/e2e/canvas-ui-experimental.spec.ts` 的当前路径描述/fixture；浏览器测试仍由当前授权边界控制，本轮不运行。真实空间常驻 canvas 与效果辅助 canvas 并存，旧全站 canvas 数量断言不能直接沿用。

非浏览器验证计划（本次均未运行）：token 缺省/合法结构/错误 feature/错误 origin/过期/损坏 payload/不泄露原值；About desktop/mobile/reduced/reading 条件矩阵；首帧成功前保留 DOM、失败/销毁释放租约、迟到回调不重新置 ready 的定点回归；目标类型检查及构建后只读产物 meta 检查。上述模拟不证明浏览器实验 API 行为。

仍需账号持有人确认的最小信息：**Chrome 注册后台当前 Valid Until/续期资格、目标 Chrome 版本，以及用户确切希望保留哪些旧效果**。无需重复索取正式域名或公开原 token；www 与线上 payload 已查。Vercel Production 环境设置/实际构建来源尚未访问后台验证。后续 tim 在普通、未开 flag 的目标 Chrome 检查 token 状态与真实页面，其他不支持浏览器验 DOM 可读可点。报告交回 PM 后停止，不自行开发、测试、发布。
