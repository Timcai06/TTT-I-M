# NR-01C · 成功绘制后的有界状态观察

版本 1；**READY**。DEV `01a08484-5199-7c22-b54e-38778cd5ed1d`，模型 `gpt-5.6-sol` / `high`。依赖 A/B 已由 PM 验收；本卡没有场景接管权。

## 目标

在已有 About → Life、Life → Frame 桥画面成功绘制后，记录同一位置的纯语义候选与真实已有节点状态，证明观察功能与旧渲染流程隔离，为 NR-02 的写入接管提供证据。新旧输出不同应如实记录，本卡不回写校正或要求两者相等。

## 基线与输入

仓库 `/Users/tim/DEV/TTT I'M/portfolio`，同目录分支 `feat/narrative-kernel`，HEAD `55c08029051b11e9687d869747907e20291940fa`。读 B 最终 PM 验收、NR-00 v2 的 NR-01C/读回边界、A sample、B inspect，以及实际 archiveRuntime.draw；按需读取现有浏览器测试配置，不重做全仓审计。

执行补充：PM 已独立复现 B 的 solution build 类型错误，授权 [NR-01B-R2](NR-01B-R2-build-type.md) 中 sceneBindings.ts 一行类型标注例外；R2 必要检查通过后可继续 C。原指纹保留，C 回报单列该授权差异，其余九文件仍受保护。

A+B 十文件受保护：`output/pm/NR-01B-R1/pm-accepted-files.json`。开工保存 runtime 原文、指纹和当前状态，结尾逐项核对；你不是唯一执行者，不覆盖 PM/ARCH/其他任务修改。

## 独占写入白名单

- `apps/landing/src/components/personal-archive/archiveRuntime.ts`：最小 import/诊断实例配置、一个成功 draw 后观察调用；如确需释放诊断缓存，可在现有 cleanup 中增加纯诊断释放。不得改现有渲染分支与顺序。
- 新增同目录 `archiveStoryShadow.ts`：无模块初始化副作用的诊断 helper、显式开关与有界内存记录。
- 新增 `apps/landing/tests/archiveStoryShadow.test.ts`：必要单元及接入隔离测试。
- 新增 `apps/landing/tests/e2e/archive-shadow.spec.ts`：本卡定点浏览器复核；不修改共享测试配置或既有测试。
- 新报告 `docs/pm/reports/NR-01C-delivery.md`，证据 `output/pm/NR-01C/`。

禁止改 A/B、Director、桥组件、Loader/ready、内容、资产、样式、依赖、共享 loader 或其他 PM 文档；禁止提交推送、创建分支/worktree、Blender 导出或自行派发下一卡。

## 实现边界

1. 唯一观察位置是 `draw` 内原有 `composer.render()` 和 `if (shaderFailure) throw shaderFailure` 之后；不能在导航、正文停驻、准备、恢复等分支另放观察点。传入 shot/p 和已有模型只读句柄；不得为了记录先进行可能抛错的场景计算而逃出诊断错误边界。
2. 默认关闭；显式诊断启用方式由 helper 最小实现并在报告写清，不持久化到用户偏好，不添加产品 UI。可在显式诊断模式提供只读快照入口，缓存固定上限，清理后释放模型引用。关闭时不解析绑定、不读节点、不构造快照；不额外 fetch/加载/等待资源，不加 rAF/timer，不逐帧 console 输出。
3. 只观察 about-life/life-frame，active 存活、未 disposed、page 非空、非准备调用；现有预热 page=null 必须排除。正文停驻、导航及其他生命周期覆盖明确 NOT_OBSERVED，不通过扩大 hook 数量补齐。
4. 调用 A sample 获得 candidate；使用 B inspect 对已有模型提供的静态描述按模型至多建立一次只读检查，不二次解析 GLB/创建模型或动作。静态描述缺证据如实 unknown，不能根据绑定表反向伪造实际节点、clip 或 channel。
5. 读取少量必要真实节点的现有 local TRS、matrixWorld、visible，和必要相机已有矩阵，复制成纯数据，与 candidate 分列。不得调用 getWorldPosition/updateMatrixWorld/mixer.update/seek 等可能触发更新的方法；不修改材质/DOM/矩阵，不创建 Mixer/renderer。旧 Director 私有 Action 明确 `unavailable: legacy-private-actions`；无 frameId/layoutVersion/resourceGeneration 则 null。诊断序号不能冒充真实帧版本。
6. helper 捕获自身采样、检查、读回错误，形成有界 diagnostic-error 或暂停诊断。不能向外冒泡触发 fail/ready/pending，也不能吞掉原本的 shader/renderer 错误。B 的 invalid/unknown 只进报告，不影响资源或 renderReady。

## 验收与必要检查

- AC-1：默认关闭零采样/检查/节点访问；支持与不支持 shot、page=null、失活/销毁条件正确过滤；记录有上限且无共享可变引用；每模型绑定检查不逐帧重复。
- AC-2：至少覆盖采样、绑定检查和读回抛错；诊断错误不改变宿主成功路径，原 renderer/shader 错误仍走原失败路径；不得只用 helper 单测宣称实际 runtime 等价。
- AC-3：读回确实来自已有节点，与 candidate 分列；真实 Action、版本和未观察生命周期诚实标注；冻结/对比输入证明无写入。
- AC-4：复核实际 archiveRuntime 接入的调用顺序与观察次数，比较受控相同输入下开/关的 render 调用数及 ready/pending/failed 顺序。可在测试内对实际 runtime 做限域替身/计数，不为测试扩写生产接口或把原 draw 逻辑复制成另一份“实现”。浏览器只做本卡必要桥段开/关烟测，真实 WebGL 不可用应报告，不跳过后声称通过。
- AC-5：A/B 十文件指纹未变；runtime diff 只有允许的诊断接入，既有写入、准备和 ready 路径不变。

执行 C 单元/接入测试、A+B 四份目标回归、Landing 类型检查、C 四文件限域 ESLint、差异检查。明确授权用仓库现有 Playwright 配置执行新增 archive-shadow.spec.ts 的定点 Chromium 检查，配置会构建 Landing 并启动临时本地预览；使用空闲端口，不占用或终止用户已有服务，完成后只清理本任务进程。不要跑全量 E2E/Studio/性能测试，不重复运行已通过检查除非代码继续变化。

如浏览器或真实 runtime 隔离证据受环境限制，不自行弱化断言；结构化报告把通过、失败、NOT_RUN 分开交 PM 判断。体积是观察项，既有 vendor integrity 问题不在本卡修复。

## 回退与交付

可先关闭诊断；需要撤回时只移除唯一观察调用、诊断配置/import/清理和本卡新增文件，保留 A/B。附明确开关操作、观察记录样例、原始检查结果、文件指纹和未验证范围。交付后停止并通知 PM；NR-02 必须由 PM 另行审查并派卡。
