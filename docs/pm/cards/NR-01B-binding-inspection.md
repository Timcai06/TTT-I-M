# NR-01B · 静态绑定检查与足球图身份

- 版本：1；状态：**READY，PM 依已确认计划在 A 验收后放行**。
- 负责会话：DEV，`01a08484-5199-7c22-b54e-38778cd5ed1d`。
- 模型：`gpt-5.6-sol` / `high`。GLB 动画/层级/内容身份涉及真实资产，继续使用主开发模型。
- 依赖：NR-01A 已 ACCEPTED；实际分支 `feat/narrative-kernel`。
- 目标：用只读数据证明当前语义字段能对应准确的模型通道和照片身份，为随后运行接管准备可检查的合同。

## 基线与必要输入

仓库 `/Users/tim/DEV/TTT I'M/portfolio`。当前 HEAD `55c08029051b11e9687d869747907e20291940fa`；A 是已验收的未提交增量。阅读 A 的 PM 验收与实际 types/sample、NR-00 v2 中 R1 映射及 R2 的 B、原合同第 3/4 节静态对象表；按需读取 GLB 和已有 content 入口。不要重做全仓审计。

A 的受保护指纹：`output/pm/NR-01A/pm-accepted-files.json`。你不是唯一执行者，保留 A 与全部 PM/ARCH 文档。开工记录实际 HEAD、起始状态和本卡文件存在性/指纹，结尾核对 A 未变化。

## 独占写入白名单

- 新增 `apps/landing/src/components/personal-archive/sceneBindings.ts`：本卡仅静态映射与只读检查，不实现 apply。
- 新增 `apps/landing/src/content/narrativeObjects.ts`：只提供足球图语义 ID 的稳定 resolver。
- 新增 `apps/landing/tests/archiveBindingContract.test.ts`。
- 新增 `apps/landing/tests/narrativeObjects.test.ts`。
- 报告 `docs/pm/reports/NR-01B-delivery.md`；新证据 `output/pm/NR-01B/`。

不得修改 A 的六个文件、runtime/Director、content/index 或 data 数组、UI、资产/scene-contract、依赖/loader、其他测试或 PM 文档。不得启动服务、运行 Blender、导出模型、提交推送、新建分支/worktree 或向其他会话派工。

## 实现约定

1. 映射由语义字段到准确的 11 条 clip、节点/property 和有效区间；一项 drawer 语义映射三条不同节点轨道合法。映射只属于绑定层，采样不得反向依赖它。
2. 静态检查接收已有数据描述或调用方提供的只读视图，返回结构化 BindingInspection：覆盖项、缺失、名字/目标/属性不匹配、区间无效、重复目标写入、未知项。浏览器模块不导入 node:fs，不主动读取磁盘/网络，不创建 GLTFLoader、Mixer、AnimationAction 或 renderer。
3. 真实 GLB 的 JSON/BIN 读取及图片字节比较放在 Node 测试/证据中；运行模块只消费所需的最小静态数据。尽量复用已有描述方式，不增加通用 glTF 框架。
4. 验证 Notebook、Life、Frame、Work/rails/folder 全部 11 通道；保留 0…duration、1…2.4、74/30…110/30 的现有区间语义。起始时间 0 可以合法位于首 key 之前并使用首帧保持，不能简单按 key 最小值否定既有合法区间；缺 duration/范围证据须明确 unknown。
5. 核对样段用到的源/目标照片、纸背、monitor 与 About/Life/Frame 阅读锚点，名称来自已审查合同与实际资产。不得假设 FramePrintSettle_04 对应带 _04 后缀的 pivot；精确绑定见原表。
6. 不修正传入对象的矩阵/可见性/材质，不假造有效动作权重。检查结果明确属于静态元数据，实际 ActionReadback 尚 unavailable。
7. resolver 将 `life-football-action` 解析到现有 `content/index.ts` 的 photos 中 `/life/football-action.webp`，核对唯一匹配并保留原 alt、尺寸和条目身份；缺失或重复返回明确错误/结构化结果，不回退第一张图，不重排内容。
8. resolver 不从数组序号定义内容身份、不引入新素材、不修改图库；当前跨组件替换为零。Final Horizon 独立，留对应 NR-05 子卡，不改四处现有消费者。
9. 新检查不接入资源准备、Loader、ready 或渲染流程。发现缺失只在检查结果和测试中体现，不改变现有应用可用性；本卡没有任何接管权。

## 验收项

- AC-1：真实现有 GLB 的 11 通道及关键对象检查结果正确；逐个缺失、改名、错误目标/属性、非法区间、重复写入等受控反例能被识别。反例仅修改内存副本，不改资产。
- AC-2：更改 clip 名只需变更传入/私有绑定定义，不修改或重新定义 SemanticWorld；inspect 前后输入深度比较或冻结验证无写入；静态结果不称真实权重通过。
- AC-3：足球 resolver 与当前 public/嵌入图字节身份一致（含 EXT_texture_webp 等实际纹理 source 路径），结果保留现有内容元信息；缺失/重复不静默替换，Final Horizon 未被混同。
- AC-4：A 的文件指纹未变，白名单外产品零修改；不存在 runtime/ready/内容消费者接入，检查与未验证范围如实报告。

## 必要验证与交回

执行新增两份目标测试、A 的两份既有目标测试作为依赖回归、Landing 类型检查、四份新增 TypeScript 的 ESLint、差异检查。读取 GLB 的测试必须实际核对资产，不只测手工 fixture。

如 content 数据的扩展名解析需要 loader，可在命令中使用仓库现有 `packages/content/tests/register-ts-loader.mjs`，先确认其适用性；不要修改 loader/package 以迁就新测试，也不要引入新测试框架。测试解析辅助逻辑可放本卡测试内，避免进入运行模块。

不运行全站构建/浏览器/性能/视觉检查。体积仅为观察项，vendor 既有问题不在本卡修复。

回退只移除本卡新增模块/测试与报告增量；本卡开始前若同名文件已经存在，先报告，不覆盖。按结构化模板提交实际结果、文件指纹、可读证据和未验证项。完成后结束，等待 PM 决定 C，不自行开始场景执行。
