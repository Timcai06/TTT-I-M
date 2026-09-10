# NR-01C · DEV 交付报告

日期：2026-09-09  
分支：`feat/narrative-kernel`  
基线 HEAD：`55c08029051b11e9687d869747907e20291940fa`

## 结果

已完成默认关闭的只读 shadow observation。`archiveRuntime.draw` 只有一个观察调用，严格位于原 `composer.render()` 与 shader failure 抛出之后；导航、正文停驻、准备、预热和恢复预热没有新增观察点。runtime 原有写入、ready/pending/failed、渲染和恢复顺序未改。

helper 只在显式启用且满足以下全部条件时工作：shot 为 `about-life` 或 `life-frame`、page 非空、active 存活、未 disposed、runtime 非准备/恢复状态。默认关闭分支不调用 sample/inspect/describe/readback，也不暴露快照入口。

启用后，每个 runtime/model 只建立一次 B 静态检查；每次记录把 A candidate 与现有 Three 节点/相机的 local TRS、`matrixWorld`、可见性和相机矩阵分列保存。读回只复制已有数值，不调用更新/采样 API，不创建 model、Action、Mixer 或 renderer。记录上限为 24；snapshot 数组和全部记录数据冻结。释放 runtime 时同时移除诊断入口、清空记录并释放 model/camera 引用。

采样、静态检查与读回异常均在 helper 内转为有界 `diagnostic-error`；静态检查异常会暂停后续诊断。renderer 与 shader 异常仍在观察调用之前沿旧路径抛出，shadow 不会吞掉或改写宿主状态。Action 明确记录为 `unavailable: legacy-private-actions`；`frameId`、`layoutVersion`、`resourceGeneration` 均为 `null`，诊断序号仅标为 `diagnosticSequence`。

## 显式启用与关闭

本功能不写用户偏好，也没有产品 UI。自动化/诊断客户端须在页面应用脚本执行前注入：

```ts
await page.addInitScript(() => {
  window.__portfolioArchiveStoryShadowEnabled = true
})
await page.goto('/')
const snapshot = await page.evaluate(() => window.__portfolioArchiveStoryShadow?.getSnapshot())
```

不注入该布尔值（或保持非 `true`）即默认关闭。关闭当前诊断会话时销毁对应页面/runtime 或关闭浏览器上下文；runtime cleanup 会删除 `__portfolioArchiveStoryShadow` 并清空诊断缓存。该开关不会跨页面持久化。

## 真实浏览器证据

仓库 Playwright `chromium-desktop` 配置在空闲端口 4287 完成 Landing build + preview，并使用本机既有 Google Chrome；最终 1/1 通过，页面错误 0。测试在实际 `about-life` 桥对默认关闭和显式开启各建立独立上下文，并对稳定后的同一实际输入 `shot=about-life, progress=0.688` 截取三个连续 runtime draw：

| 项目 | 关闭 | 开启 |
|---|---:|---:|
| runtime draw / render 对齐计数 | 3 | 3 |
| WebGL draw 命令 | 587 | 587 |
| 生命周期 | `false/false → true/false` | `false/false → true/false` |
| page errors | 0 | 0 |
| 诊断入口 | 不存在 | 存在 |

开启侧记录 14 条（上限 24），未暂停；最新记录序号 14，B 静态状态 `valid`，16 个选定节点均来自真实现有模型且 present。candidate segment/progress 与 runtime 的 `about-life / 0.688` 一致，Action 和版本缺口按上述不可用/null 记录。B 若返回 invalid/unknown 的单元边界只进入诊断记录，不改变宿主成功路径。

结构化浏览器结果见 `output/pm/NR-01C/browser-smoke.json`。配置构建仍报告既有 mediaCache ineffective dynamic import 与大于 720 kB 的 chunk 警告；本卡未改构建配置。构建产物列表中 archiveRuntime chunk 为 39.3K、three-core 为 769.4K（均为列表显示的未压缩大小，仅作观察，不宣称与基线的增量比较）。预览结束后端口 4287 无监听。

## 自动检查

- C + A/B 四份目标回归：26/26 通过，退出 0。
- Landing app typecheck：退出 0。
- C 四文件限域 ESLint：退出 0，无问题。
- `git diff --check`：退出 0。
- C 定点 Chromium：1/1 通过；真实 WebGL 可用，非 skip。
- runtime 差异：仅 1 个 import、诊断实例/cleanup、成功 draw 后 1 次 observe，共新增 12 行；无删除。
- helper 禁止能力搜索：无 fetch、rAF、timer、console、世界矩阵更新、world-position 查询、Mixer/Action 采样或 renderer 创建。

完整命令结果摘要见 `output/pm/NR-01C/checks.txt`。

## 指纹与授权例外

runtime 原 SHA-256 为 `fdbfb8f…c7348f`，交付 SHA-256 为 `972b2eb…64f89`。C 四文件及 A/B 全部核对结果见 `output/pm/NR-01C/final-hashes.txt`。

A/B 十文件中九项与 PM accepted manifest 完全一致。唯一差异是 C 执行中 PM 另行授权的 NR-01B-R2：`sceneBindings.ts` 只增加局部 `animation` 的显式 `| undefined` 类型标注，使 solution build 通过；前指纹 `2c1d2c…d0dd0d9`，后指纹 `be3c798…550533`。R2 的独立报告为 `docs/pm/reports/NR-01B-R2-delivery.md`，没有覆盖原历史指纹。

## 失败记录与未验证边界

最终检查无失败或 NOT_RUN。历史执行中，第一次 Playwright 构建暴露 R2 类型遗漏；PM 授权修正后 solution build 通过。默认 headless-shell 未安装，随后通过同一仓库配置指定本机已有 Chrome 完成真实浏览器检查。若干中间 E2E 断言因误设 canvas 所属、固定进度、B 必须 invalid/unknown 或按墙钟累计 GPU 命令而失败，均只修正测试证据口径；最终断言使用共享 canvas、实际 progress、真实 B 状态及固定三次 runtime draw。

未验证 NR-02 场景写入接管、真实 legacy Action 权重、其他章节的浏览器行为、整站全量 E2E、Studio、性能基准或人工逐帧视觉验收；这些均不在本卡授权范围。未提交、未推送、未创建分支/worktree，未进入 NR-02。
