# NR-01B-R2 · solution build 类型声明修正

2026-09-09，版本 1，**READY**。DEV / `gpt-5.6-sol` high；作为 C 执行中唯一新增的 B 文件写入例外，与 C 串行完成。

## PM 核实

PM 独立执行 Landing `npx tsc -b --pretty false`，退出 2，复现 `sceneBindings.ts:343 TS2322`。原 app-only 类型检查通过，但 solution build 同时包含 node/test 项目；新测试导入该模块，另一项目配置下 `animations[0]` 未推断出 undefined 联合类型，随后赋值 undefined 失败。

B 原静态功能验收与 19 测试结果仍有效；原验收明确未测构建。本次是当前 B 实现的构建兼容遗漏，不能标作无关既有错误，也不修改测试配置绕过。

## 唯一产品修正

仅允许将 `apps/landing/src/components/personal-archive/sceneBindings.ts` 中：

```ts
let animation = animations[0]
```

改为：

```ts
let animation: StaticSceneDescription['animations'][number] | undefined = animations[0]
```

不改逻辑、配置、依赖、其他 A/B 文件，不移除缺失动画处理。你不是唯一执行者，保护当前 C 增量及 PM/ARCH 文档。无需为纯类型标注新增测试；已有 missing-clip 用例覆盖行为。

## 检查、指纹与继续条件

执行 `tsc -b --pretty false`、archiveBindingContract 目标测试、单文件 ESLint 及差异检查，记录退出码和修改前后 SHA-256。四项通过即可按原 C 卡继续定点浏览器验证，不必再次等待权限；如仍有错误，报告具体失败，不扩大 B 修改范围。

原 A+B 十文件验收指纹保留为历史，不覆盖；C 结尾把该文件列为 PM 已授权 R2 例外，并引用前后指纹，其余九文件仍必须逐项一致。

只新增报告 `docs/pm/reports/NR-01B-R2-delivery.md` 与证据 `output/pm/NR-01B-R2/`，原交付/验收不覆盖。请先通知 PM R2 检查结果，再继续 C；不提交推送，NR-02 仍未授权。
