# VR-02A · 配置模块交付

```yaml
task_id: VR-02A
card_version: 1
status: DELIVERED
thread_id: 01a08483-8c0c-7fd0-b1a5-9ecc926e4f30
model: 当前会话配置，未覆盖；精确型号不可读取
reasoning_effort: 当前会话配置
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: output/pm/VR-02A/baseline.json
changes:
  files:
    - apps/landing/config/htmlInCanvasOriginTrial.ts
    - apps/landing/tests/htmlInCanvasOriginTrial.test.ts
    - apps/landing/vite.config.ts
    - apps/landing/.env.example
    - docs/html-in-canvas-deployment.md
  report_file: docs/pm/reports/VR-02A-delivery.md
acceptance:
  - id: 有界公开 payload 与 origin/feature/expiry 诊断
    result: PASS
    evidence: 单元测试；不验证签名
  - id: 初始 HTML 注入与无 token 降级
    result: PASS
    evidence: 独立 Vite fixture，write=false
  - id: 目标浏览器及正式发布
    result: NOT_RUN
checks:
  - command_or_action: node --test tests/htmlInCanvasOriginTrial.test.ts
    scope: 仅本模块，9 tests
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02A/unit.log
  - command_or_action: eslint config/htmlInCanvasOriginTrial.ts tests/htmlInCanvasOriginTrial.test.ts vite.config.ts
    scope: 仅三个白名单 TS 文件
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02A/lint.log
  - command_or_action: tsc --noEmit --ignoreConfig，显式只输入配置模块与其测试
    scope: strict / ES2023 / bundler；不写 tsbuildinfo
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02A/types.log 与 checks.json 完整参数
  - command_or_action: Vite build API，configFile=false / write=false
    scope: output/pm/VR-02A/html-fixture；Production token-only、继承 token Preview、无 token Preview 三种初始 HTML
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02A/html-transform.log
  - command_or_action: git diff --check，限定白名单
    scope: 本卡文件
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02A/diff-check.log
unverified:
  - 全应用构建、浏览器 token 接受、运行时能力和首帧
  - 远端环境变量、注册 Valid Until 和续期资格
risks_or_blockers:
  - 结构校验不等于浏览器接受；canonical 域名变更须同步核对配置
scope_deviations: []
rollback: 用 baseline.json 中的完整原文恢复本卡五个文件；原不存在的部署说明可移除，不操作其他工作区变更
cost:
  elapsed_minutes: unknown
  retries: 1 # 初次静态检查猜测 apps/landing/node_modules/.bin 不存在，改用根工作区已有工具；无安装
  tokens_or_cost: unknown
recommended_next_action: PM 核对修订候选；无需新增远端变量，全应用构建由 DEV/PM 串行执行，发布仍由 tim 控制
```

有 token 时，新配置按 Chromium v2/v3 布局检查编码、头部、payload 字节长度、UTF-8 JSON 和公开字段，验证 HTMLInCanvas、HTTPS 目标 origin 与 expiry；长度限制为 token 6144 / payload 4096。错误只含固定原因，不回显 token 或 JSON。v3 third-party/subset 不属于此第一方部署策略，明确拒绝；v2 按 Chromium 语义不启用这两个 v3 字段。合成零签名 token 也能通过结构测试，刻意证明这里不是签名验证。

最终政策（按 PM 定点复核修订）：现有 Vercel Production token-only 配置向后兼容，默认使用 index.html 已确定的 www canonical，ORIGIN 仅可选覆盖；不要求 tim 补新环境变量。Vite 只传真实 process.env.VERCEL_ENV/VERCEL_URL，不用 mode=production 冒充正式环境。

Preview 使用平台实际 URL 判定：无 URL、继承的 ORIGIN 指向其他目标、或无显式覆盖时 token 与 Preview 不匹配，都跳过注入并提示 DOM fallback，不声称 token 有效。显式 ORIGIN 指向当前 Preview 而 token 不匹配仍报错。非 Vercel/本地未明确 ORIGIN 也不自动假定生产。无 token 始终正常降级构建；目标匹配后的功能、结构、过期等错误仍中止构建。ORIGIN 显式错误的检查与签名边界保留。

新增两项回归覆盖 Production 无新 env 与 Preview 不误用生产 token；最终 **9 tests / 9 pass**，lint 与模块类型检查均 exit 0。隔离 Vite fixture 重新验证 Production token-only 有 meta、继承 token 的 Preview 和无 token Preview 无 meta，三者保留 DOM。未改变远端配置或要求用户手动补代码。

[部署说明](../../html-in-canvas-deployment.md)记录 www 跳转、注册与 expiry 的区别、授权部署后才生效、普通目标 Chrome 与不支持浏览器的后续验证。格式依据为 [Chromium trial_token.cc](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/common/origin_trials/trial_token.cc)，本次只读官方源码确认结构限制。

完整原文与 SHA-256：`output/pm/VR-02A/baseline.json`（修改前）、`candidate.json`（最终五文件）；`checks.json` 保存完整检查参数与退出状态。初次工具路径定位失败不涉及产品或依赖修改。HTML fixture 检查不启动服务、无浏览器且 write=false；全应用 dist、tsbuildinfo、DEV 空间源码未触碰。交回 PM 后停止，不续接其他卡、不提交/推送/发布。
