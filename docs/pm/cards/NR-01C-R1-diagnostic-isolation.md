# NR-01C-R1 · 未知轨道与诊断全生命周期隔离

版本 1，**READY**；父卡 C 为 REWORK。DEV / `gpt-5.6-sol` high，同目录 `feat/narrative-kernel`。先读 [PM 审查](../reports/NR-01C-pm-review.md)。

## 唯一范围

允许修改原 C 四文件：archiveStoryShadow.ts、archiveRuntime.ts、archiveStoryShadow.test.ts、tests/e2e/archive-shadow.spec.ts；新报告 `docs/pm/reports/NR-01C-R1-delivery.md`，新证据 `output/pm/NR-01C-R1/`。所有路径位于原 C 卡指定目录。A/B（含已验收 R2）仍保护，原 C 报告/证据及 PM/ARCH 文档不覆盖。你不是唯一执行者，保留其他修改。

## 两项修订

1. 已选 clip 的未知轨道不得从描述中静默消失后得到 valid。保留可追溯的未知事实或在诊断内捕获并暂停；记录 clip 与原 track name，不能伪造一种已知 property。无需支持所有 Three track 语法，不扩写 B。加入真实 GLB 派生描述/等价实际 AnimationClip 上的额外未知轨道反例。
2. 从读取诊断开关、创建/暴露入口到 cleanup，都保证诊断自身错误不能触发宿主资源失败、阻止既有清理或覆盖既有全局值。默认关闭仍不读场景；冲突只禁用诊断并安全退出。保持一个 post-render observe 点，不把原 renderer/shader 包进吞错边界。

## 证据与验收

- 复现并关闭 PM 两个反例；正常轨道检查、不可用动作/版本、输入只读、有界缓存等原测试保持有效。
- 在实际 runtime 执行路径验证诊断初始化失败后原页面仍 ready/可画；受控 renderer 或 shader 失败仍执行原失败行为。可在测试内注入浏览器故障或限域依赖替身，禁止把 runtime draw 复制成测试实现，不为测试添加生产控制接口。
- 既有 E2E 中 canvas 属性变更次数与 DOM 状态序列按代理观测明确命名；不要称直接 composer.render 次数或完整 SurfaceEvents 顺序。正常模式对比与故障证据分开报告；只观察的 About → Life 不扩张为所有桥结论。
- A/B 十文件相对 R2 后状态不变；runtime 修改只为上述诊断隔离，不改产品渲染/资源/内容逻辑。

必要检查：C+A/B 五份目标测试、Landing 完整 `tsc -b`、C 四文件限域 ESLint、差异检查；原 C 授权的定点 Chromium/build/临时预览继续有效，加入上述实际故障验证。用空闲端口，只清理本任务进程；不运行全站 E2E、性能或 Studio。改动后完成一次相关检查即可，不反复运行全绿检查。

原卡禁止提交推送、新分支/worktree、模型改动及自行进入 NR-02 的限制继续适用。交结构化修订报告、前后指纹及原始检查输出后停止，等 PM 验收。
