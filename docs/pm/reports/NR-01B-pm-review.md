# NR-01B v1 · PM 独立审查

2026-09-09，结论 **REWORK**。仅一项定点修订；NR-01C 未放行。

实际 checkout `/Users/tim/DEV/TTT I'M/portfolio`，分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。本结论针对未提交的 B v1 增量。

## 已验证

- 独立执行 A+B 四份目标测试，16/16 PASS，退出 0。
- Landing 类型检查、B 四份文件限域 ESLint、原始 `git diff --check` 均退出 0。
- 实际 GLB 通过 11 条声明绑定与 30 个必要对象检查；两张足球载体的嵌入 WebP 与 public 图字节一致。resolver 保留原 photos 条目身份，并明确拒绝缺失、重复和无关 ID。
- A 六文件 SHA-256 逐项未变；当前产品差异为 A 六文件和 B 四新增文件。B 尚未接管 runtime/ready；Action 实际状态标记 unavailable 正确。

## R1：检查器漏掉已绑定 clip 中的额外轨道

位置：`sceneBindings.ts` 的 `inspectSceneBindings`，当前只筛选目标 node/property 的 exactChannels，发现一条就继续；重复 writer 表又仅来自绑定声明，没有检查已绑定 clip 的全部实际 channels。

PM 用真实 GLB 解析的只读描述建立内存副本，在 `NotebookOpen.channels` 保留原轨道并追加 `{ node: 'LifeEnvelopeHinge', property: 'rotation' }`。实际结果仍为 `status: valid`、11/11 covered、`issues: []`。该新增轨道与 `LifeEnvelopeOpen` 驱动同一属性，静态合同未识别控制冲突。没有修改 GLB 或创建任何 Action。

这不表示当前资产已经存在冲突；它证明 AC-1 中重复写入/错误目标的防护存在漏检，不能以当前资产成功和既有 16 测试通过替代。若后续绑定按完整 clip 执行，额外轨道会超出语义声明的写入范围。

## 修订与验收

见 [NR-01B-R1 定点卡](../cards/NR-01B-R1-channel-coverage.md)。仅补齐已绑定 clip 的实际轨道集合核验和反例，不重做 resolver、不扩展到运行时权重判断、不把未选中的 clip 当作正在运行。

AC-1 暂不通过；AC-2/3 已有证据成立，AC-4 的范围与隔离检查通过。真实运行、完整动作读回、浏览器投影及视觉连续性仍未测。PM 未启动服务、提交或推送。
