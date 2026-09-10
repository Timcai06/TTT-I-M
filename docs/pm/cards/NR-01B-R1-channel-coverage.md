# NR-01B-R1 · 补齐已绑定动画的轨道核验

版本 1，**READY**；父卡 NR-01B v1 状态 REWORK。DEV / `gpt-5.6-sol` high。NR-01C 不得开工。

## 目标与证据

先读 [PM 审查](../reports/NR-01B-pm-review.md)。保留真实 GLB 的 NotebookOpen 原轨道，并在内存中加入 LifeEnvelopeHinge.rotation，当前检查返回 valid/零问题。修复此漏检，使静态绑定声明与选中 clip 的完整实际写入范围一致。

## 独占写入范围

- `apps/landing/src/components/personal-archive/sceneBindings.ts`
- `apps/landing/tests/archiveBindingContract.test.ts`
- 新报告 `docs/pm/reports/NR-01B-R1-delivery.md`
- 新证据 `output/pm/NR-01B-R1/`

你不是唯一执行者。A 六文件、B resolver 与照片测试、原 B 报告、全部 PM 文档及其他产品文件保持原状。原卡的所有禁止项继续适用，不改真实资产，不接入 runtime/ready，不建服务、分支或 worktree，不提交推送。

## 修订要求

1. 检查每个绑定选中的 clip 的全部实际 channels；未声明的额外 node/property 必须有结构化诊断，不能保持 valid。诊断可新增适当 code，但应说明 clip 和实际目标。
2. 依据选中 clip 的实际轨道识别跨 clip 重复 node/property，并将问题关联到受影响绑定，使相关 coverage 不再全部 covered。区分静态潜在冲突与实际动作权重；仍标 Action readback unavailable。
3. 范围仅限传入绑定选择的 clips。未选择的其他 clip 不是当前动作 writer，不因为它存在就宣称运行冲突。无需扩展成全局动画框架。
4. 增加从真实 GLB 描述派生的反例：已绑定 clip 额外写另一已绑定属性；额外写不同且未声明属性；同一 clip 重复 channel。断言结果状态和定位信息，不能只断言任意 issue 存在。保留真实资产通过、合法私有 clip 改名与输入不变的原测试。

## 必要验证

执行 A+B 四份目标测试、Landing 类型检查、此次两文件限域 ESLint、差异检查；逐项核验 A 六文件与 B resolver/照片测试指纹不变。只跑上述相关检查，不拓展构建或浏览器验收。按结构化模板另交修订报告，原报告保留；完成后停止，等待 PM 审查。
