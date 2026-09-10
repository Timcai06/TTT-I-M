# NR-01A · PM 验收

2026-09-09。结论：**ACCEPTED，纯数据合同完成。** 尚未接入画面，不代表真实相机、投影或物件运行效果通过。

基线：`feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`；A 的未提交实现与既有 PM/ARCH 文档共存。PM 没有修改 A 的产品代码。

## 审查与证据

- 实际阅读 types/specs/index/sampleStory 与两份测试，检查纯函数依赖、状态端点、输入验证、输出引用隔离及旧 Work spec。
- 独立核对产品差异：仅卡内六个 TypeScript 文件；卡外基线指纹没有漂移。现有源码未调用 sampleStory，也未消费新的样段 spec。
- 独立执行 `node --test apps/landing/tests/sampleStory.test.ts apps/landing/tests/narrativeSpec.test.ts`：9/9 通过，退出码 0。
- 独立执行 `npm run typecheck:landing`：退出码 0。
- 在 Landing 目录对六个修改文件执行 ESLint：退出码 0。
- `git diff --check`：退出码 0。

上述检查均实际完成，命令通过 RTK 包装。未运行全站构建、浏览器、模型或服务；不继承其他卡的运行结果。

| 验收项 | PM 判定 | 说明 |
| --- | --- | --- |
| AC-1 固定预期与非法输入 | 通过 | 五段端点、抽出边界、转移中点与规范端点、无效段/版本/进度均覆盖 |
| AC-2 确定性与引用隔离 | 通过 | 正序/倒序/乱序/重复一致；新建冻结的嵌套结果，无输入或旧结果改写；无书签、时间、模型读取 |
| AC-3 范围与兼容 | 通过 | Work spec 与既有列表保持；新数据独立导出；没有新增运行时消费者或依赖 |
| AC-4 真实回报 | 通过 | 明确纯数据交付和未验证边界，提供范围备份、指纹及检查记录 |

## 后续边界

CameraIntent 的端点可用于定义后续适配要求，但当前测试只能证明意图数据，不证明空间相机的实际连续性。readingOwner、roomHit、focus 的真实切换也须在 NR-02/03 用实际对象/DOM 验证。NR-01B 不承担这些运行时工作。

依据 tim 已确认的计划及“每卡交回后由 PM 决定是否放行下一卡”的流程，放行 [NR-01B](../cards/NR-01B-binding-inspection.md)。A 的六文件指纹随 PM 验收保存到 `output/pm/NR-01A/pm-accepted-files.json`，B 必须保留；不另请求重复的阶段启动确认。NR-01C 仍等待 B 验收。

本轮未提交、推送或发布。QA 对此纯数据小卡不再重复整套检查；真实绑定和同帧接管阶段再安排独立专项复核。
