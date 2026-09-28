# NR-01C v1 · PM 独立审查

2026-09-09，**REWORK**。NR-02 不放行。审查当前 `feat/narrative-kernel` 未提交增量，HEAD `55c08029051b11e9687d869747907e20291940fa`。

## 已验证

PM 阅读 helper、runtime 完整增量及两份测试，独立执行 C+A/B 五份目标测试 **26/26 PASS**、Landing `tsc -b`、C 四文件 ESLint、差异检查，均退出 0。runtime 只有一个成功 render/shader 检查后的 observe，读回本身不调用更新 API；有界记录、Action unavailable 与版本 null 的分离正确。

DEV 浏览器证据为正常开关下 **About → Life** 的一次烟测；PM 本轮未重跑浏览器。该证据不能覆盖故障隔离或其他桥/生命周期。

## R1-a：描述适配器静默丢弃无法解析的轨道

`describeArchiveScene` 用 `flatMap` 将 `parseTrack` 返回 null 的轨道直接丢弃。PM 从当前真实 GLB 派生节点树和轨道名称描述，原 B 检查 valid；向选中的 NotebookOpen 添加 `NotebookHinge.visible` 后，经 C 描述转交 B，仍为 valid、issues=[]。这使 B 已补好的完整轨道核验失去输入事实。

修订应保留未知事实或明确暂停并记录诊断错误；不要求支持新动画属性，但不能删掉未知轨道后报告完整有效。不修改 B 或真实资产。

## R1-b：诊断初始化/入口注册不在隔离边界

runtime 在原资源 try 内直接调用开关读取、创建和 `exposeArchiveStoryShadow`。observe 内的 catch 不覆盖此阶段。PM 在传入 target 上预置不可重定义的同名诊断槽，调用 expose 得到 `Cannot redefine property: __portfolioArchiveStoryShadow`。当前 runtime 中该异常会进入原资源失败/清理路径，违背诊断不能改变宿主可用性的合同；显式开启诊断也须满足这一点。

应把诊断初始化、暴露和清理纳入不会影响原运行的边界，失败只停用诊断，不覆盖未知已有全局值。已有 renderer/shader 异常必须继续保留原失败行为。

两个 PM 内存反例结果在 `output/pm/NR-01C/pm-counterexamples.json`。没有修改资产或启动服务。

## 接入证据口径

现单元接入检查是源码字符串顺序断言，并非实际 runtime 故障执行。E2E 的 `renderCalls` 来自 canvas `data-archive-progress` 属性变更，`lifecycle` 来自 bridge DOM 属性；这些是代理观测，不是直接 composer 调用计数和 SurfaceEvents 全事件日志。保留它们的用途，但修订报告须准确命名，不宣称已覆盖全部 ready/pending/failed 或 renderer 故障。

R1 用实际 runtime 的受控故障路径补证：至少覆盖诊断初始化失败后页面仍 ready 且可画，以及原渲染失败仍被正确处理。优先复用已有浏览器测试内注入或限域依赖替身，不新增产品诊断面板、框架或测试专用运行控制接口。

本轮不否定正常桥的已交付证据；AC-1/3 的部分实现成立，AC-2/4 仍需修订。按 [C-R1 卡](../cards/NR-01C-R1-diagnostic-isolation.md) 定点完成后再验收。
