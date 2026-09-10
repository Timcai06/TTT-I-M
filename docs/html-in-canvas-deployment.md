# HTML-in-Canvas 部署配置

2026-09-10 HTTP 核对：`https://crt-dsg.com` 307 跳转 `https://www.crt-dsg.com/`，最终 200。已有公开 token 的 origin 与 www 匹配；原 token 未保存进仓库，签名接受与实际效果仍待目标 Chrome 验证。

保留已有 `HTML_IN_CANVAS_ORIGIN_TRIAL_TOKEN`。**现有 Vercel Production 仅配置 TOKEN 即可，无需新增环境变量**：`VERCEL_ENV=production` 时默认使用 index.html 已确定的 canonical `https://www.crt-dsg.com`。`HTML_IN_CANVAS_ORIGIN_TRIAL_ORIGIN` 仅为可选目标覆盖；不需要修改远端配置。

构建规则：

- 无 token：不注入 meta，本地与 Preview 正常构建并使用 DOM 降级。
- Vercel Production：使用可选 ORIGIN，否则使用已确认的 www canonical。目标内的损坏 token、错误功能/显式 origin 不匹配、过期均中止构建，错误不回显原值。
- Vercel Preview：用平台 `VERCEL_ENV=preview` 和 `VERCEL_URL` 判定真实目标。没有实际 Preview URL，或继承的 ORIGIN 指向其他域名时，不注入并输出固定降级提示。未显式覆盖 ORIGIN 时，token origin 与 Preview 不匹配也不注入；不会把继承的生产 token 误称为 Preview 可用。
- Preview 独立试用：对应 token 匹配实际 Preview URL 才可注入。显式 ORIGIN 指向该 Preview 但 token 不匹配，仍明确报错。
- 非 Vercel/本地：不根据 Vite `mode=production` 猜正式环境；未明确 ORIGIN 时跳过 token 注入。确需为明确 HTTPS 目标构建时，可使用可选 ORIGIN 指定目标。

`VERCEL_ENV/VERCEL_URL` 来自部署平台，不从本地 env 文件冒充平台状态。canonical 默认常量与 index.html 的 og:url/注释一致；将来迁移正式域名时应同步核对，或用可选覆盖。

插件保留初始 HTML head-prepend，在应用能力检测前注入。诊断按 [Chromium v2/v3 格式](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/common/origin_trials/trial_token.cc)检查 Base64、头部长度、UTF-8 JSON、功能/origin/expiry；当前策略支持 HTTPS 第一方，明确拒绝 v3 third-party/subset。**不验证签名、撤销、浏览器资格或试用开放状态**；expiry 不等于注册后台 Valid Until。非目标部署跳过的 token 不作“有效”判断。

已部署页面不会随 token 到期自动重建，仍需保留运行时 DOM 降级。账号持有人在[Chrome 注册页](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849)确认版本窗口与续期。参考[官方排障](https://developer.chrome.com/docs/web-platform/origin-trial-troubleshooting)。本任务不修改远端、不续期、不发布；配置代码变更须经 tim 授权部署才生效。

后续由 tim 在未开实验 flag 的目标 Chrome 检查 token 状态、API 能力与首帧；不支持浏览器检查正文与点击。token 成功不代表历史效果均在当前调用路径，也不承诺所有浏览器一致。
