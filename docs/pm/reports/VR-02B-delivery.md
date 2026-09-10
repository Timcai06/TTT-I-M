# VR-02B · About 真实阅读捕获交付

```yaml
task_id: VR-02B
card_version: 1
status: DELIVERED
thread_id: 01a08483-8c0c-7fd0-b1a5-9ecc926e4f30
model: 当前配置，未覆盖；精确型号不可读取
reasoning_effort: 当前配置
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: output/pm/VR-02B/baseline.json，三个既有组件开始时 git status 无修改
changes:
  files:
    - apps/landing/src/components/About.tsx
    - apps/landing/src/components/effects/AboutDecryptReveal.tsx
    - apps/landing/src/components/effects/CanvasUiHtmlSurface.tsx
    - apps/landing/src/components/effects/aboutCaptureEligibility.ts
    - apps/landing/tests/aboutCaptureEligibility.test.ts
    - apps/landing/tests/canvasSurfaceAdmission.test.ts
  report_file: docs/pm/reports/VR-02B-delivery.md
acceptance:
  - id: About 启用矛盾与 preview 排除
    result: PASS
    evidence: About 入口改为 decryptEnabled && !preview；移动/reduced/能力/租约继续由通用 surface 排除
  - id: 真实正文阅读与路由互斥
    result: PASS
    evidence: 语义 DOM 读取及有界祖先属性观察；定点测试
  - id: 异步取消与首帧资源握手
    result: PASS
    evidence: 实际启动 effect 在受控资源测试中执行；不是浏览器绘制验证
  - id: 真实 HTML 捕获、视觉、点击与 React 浏览器调度
    result: NOT_RUN
checks:
  - command_or_action: node --test tests/aboutCaptureEligibility.test.ts tests/canvasSurfaceAdmission.test.ts
    scope: 13 tests，语义 DOM/观察器与实际 surface 启动逻辑的模拟资源检查
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02B/unit.log
  - command_or_action: eslint，明确列入本卡六个文件
    scope: 白名单
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02B/lint.log
  - command_or_action: tsc --noEmit --ignoreConfig，显式本卡入口与既有 ambient 声明
    scope: strict / ES2023 / bundler / react-jsx；解析其依赖，不写共享 tsbuildinfo
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02B/types.log；完整参数见 checks.json
  - command_or_action: git diff --check，限定六个文件
    scope: 本卡
    exit_code: 0
    result: PASS
    evidence: output/pm/VR-02B/diff-check.log
unverified:
  - 普通目标 Chrome 的真实 token 接受与 HTML-in-Canvas 首帧
  - 真实浏览器阅读往返、返回路由、首帧无闪烁和正文点击
  - 最终全应用集成构建
risks_or_blockers:
  - 通用 surface 首帧握手同时作用于 Glass；静态确认其驱动也调用 hasVisibleCapture/onFirstFrame，真实效果回归未运行
scope_deviations: []
rollback: 仅按 baseline.json 恢复三个原组件并移除新增辅助/两个测试；不操作 DEV 文件
cost:
  elapsed_minutes: unknown
  retries: 2
  tokens_or_cost: unknown
recommended_next_action: PM 核对候选；DEV/PM 串行集成构建，tim 做真实前端验收
```

## 根因与最终行为

旧 About 只在 mobile/reduced 时启用，而通用 surface 又排除这两类，导致 Decrypt 永远不启动。直接删条件仍不够：只读确认 ArchiveAbout 的 reading 来自 entry 完成标记，离章可能不重置；实际正文是否可交互由 inert、可见性及 html 的 data-archive-routing 决定。

现在 About 仅在非 preview 且外层允许时尝试，AboutDecryptReveal 另外读取实际 `#about` 语义 DOM：必须连接、是 document 中真实 About，不能是返回/桥接/捕获副本；本身及祖先不能 inert/hidden/aria-hidden、display:none、visibility:hidden/collapse、opacity:0，文档不能隐藏或正在路由。只观察 host 到 html 的祖先属性和 visibilitychange，不观察全站 subtree、不轮询、不读取诊断记录、不新增叙事时钟。状态变化才通知 React；取消订阅清理全部监听。仅检查入口 reading 的不足已覆盖。

## 生命周期修订

通用 surface 增加可选的实时资格查询，About 使用；工厂 Promise、租约回调、创建结束、像素探测与首帧回调都会重查。启动超时已报失败后，迟到工厂不再创建 renderer；创建期间失去资格则销毁结果并释放租约。销毁/失败后的迟到首帧不能 ready。

真实像素仍在上传时用原 16×16 非空探测确认。本次将成功捕获证据保留在当前实例周期内；驱动上传后清空 source，不能在稍后输出首帧回调再读空 source。必须既有捕获证据又有成功返回的实例才能 ready，避免同步 onFirstFrame 后工厂返回 null 却提前隐藏正文。首帧超时、图片等待、DOM 结构、输出 pointer-events 策略及现有 context 清理保留；不修改 vendor 或样式。

## 验证的实际边界

5 项语义 DOM 测试覆盖复制/断连、离章 inert、路由、祖先隐藏、后台文档、观察器去重/清理与观察器通知前的同步重查。8 项 surface 测试把**当前实际 TSX 编译后启动 effect**放进受控 hook/资源环境，覆盖迟到工厂、超时、同步首帧、空工厂、路由变更、无捕获首帧、创建中撤销、销毁异常及上下文丢失；这些检查的是执行顺序与资源释放，像素来自模拟，不能宣称真实捕获通过，也未模拟完整 React 调度。

首轮限定类型检查遗漏既有 `src/types/html-in-canvas.d.ts`，加入该只读声明后通过；首轮 lint 的测试未用参数及 Node 测试项目无法解析 TSX type-import 已通过删未用参数、测试边界局部类型解决。没有改项目配置、安装依赖或改其他类型文件。

完整原文与 SHA-256：`output/pm/VR-02B/baseline.json`、`candidate.json`。最终六个文件与结果在 `checks.json` 可复核。未改 VR-02A、ArchiveAbout、桥接/runtime/路由/模型/样式，未写共享 dist/tsbuildinfo，未运行服务/浏览器/全应用构建或全测试，未提交/推送/部署。交回 PM 后停止。
