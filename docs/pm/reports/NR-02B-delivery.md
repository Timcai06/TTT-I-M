# NR-02B · 样段完整接管交付

```yaml
task_id: NR-02B
card_version: 2
status: DELIVERED # 交回 PM，不是 PM ACCEPTED 或 tim 视觉接受
thread_id: 01a08484-5199-7c22-b54e-38778cd5ed1d
model: gpt-6-astra
reasoning_effort: high
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  working_tree_evidence: output/pm/NR-02B/baseline.json
changes:
  file_manifest: output/pm/NR-02B/final-files.json
  product_files: 17
  test_files: 7
  report_file: docs/pm/reports/NR-02B-delivery.md
checks:
  unit: PASS # 40/40，0 skipped
  typescript_solution: PASS
  scoped_eslint: PASS
  diff_check: PASS
  protected_accepted_files: PASS # 12/12
  final_browser: PASS # 22/22，0 skipped/unexpected/flaky，294.038 秒
acceptance:
  - { id: V1, result: PASS, scope: "76 点独立 oracle + 五段代表位置 fresh/history 配对，非穷举" }
  - { id: V2, result: PASS, scope: "实际四角投影与 viewport/page 尺寸单测" }
  - { id: V3, result: PASS, scope: "许可、准备、唯一 rig 和列明的真实入口" }
  - { id: V4, result: PASS, scope: "书签、返回、深链、第二请求和取消" }
  - { id: V5, result: PASS, scope: "真实 GPU 与 resize/load；visibility 为注入事件" }
  - { id: V6, result: PASS, scope: "绑定、投影、诊断和真实绘制故障" }
  - { id: V7, result: PASS, scope: "列明的技术回归，tim 视觉仍 PENDING" }
unverified:
  - 非零 pointer 输入序列的跨 context 等价性实验
  - OS 后台标签计时行为、完整性能基准和 lab 全量 raycast
  - tim 最终画面与节奏验收
scope_deviations: [] # lab 和 A/C 源码断言已由 PM 明确追加白名单
cost:
  elapsed_minutes: unknown
  retries: unknown # 经多轮定点检查，不伪造压缩前的完整计数
  tokens_or_cost: unknown
recommended_next_action: PM 审查最终候选与本报告；DEV 不自行续接下一张卡。
```

## 交回结果与实际范围

默认 About 阅读、About→Life、Life 阅读、Life→Frame、Frame 阅读由语义位置驱动。唯一已接受动画 rig 保持原文件指纹；coordinator 全量执行 11 动作及照片/monitor 可见性，Director 只计算 legacy 计划与相机。世界和矩阵完成后计算最终相机，再计算 source/target/hit 投影、应用 DOM/pass、绘制并发布成功帧。

保留原房间、真实 Index、About 全文、Life/Frame 原图、书签和样段外 legacy 表现；Frame 的三个摄影子章节也纳入 live 阅读交互归属。没有提交、推送、部署、新 worktree、资产/内容/依赖/配置改动，也没有执行 Studio 或手机 3D。

17 个产品文件为卡片原 16 个加 PM 批准的 lab 接线；7 个测试文件为卡片原 5 个加 PM 批准的 A/C 源码结构断言适配。完整相对路径、起始/最终 SHA-256、字节数见 `final-files.json`。该清单不把仓库已有 NR-01/A 或 PM 文档增量计入本卡。

关键接缝：

- 同一个 rig/token 集合，prepare 不提交 session；sample→legacy 从目标 authored 状态重置。前台 owner 与准备许可分别记录，GPU 恢复借用 legacy 不会丢失跨域重置依据。
- ScrollTrigger 四桥实际范围组成五段半开区间，缺失/逆序布局不猜测。刷新时采集 viewport/DPR/page 尺寸和原点；每帧按当前 sticky 容器位置采集 viewport 原点，尺寸变化必须重新刷新。无效布局不冒领成功帧。
- 导航、同章、无源、Frame 子锚点、返回物件统一走即时样段请求；新请求/滚动键/wheel 可取消旧请求；Index 的关闭动画和 pendingScroll 同时撤销。
- `draw` 返回本次成功类型，所有恢复/激活/清理的 visible/ready 判断消费该结果。真实 draw、非法投影和绑定失败后撤掉空间遮挡、hit、正文隐藏与 routing 样式，不能通过 owner=null 反向恢复 canvas。
- 诊断默认关闭，只读深冻结，最多 32 条；记录实际 GLB 字节 hash、StoryFrame 版本/意图、执行许可、动作/30 节点/材质纹理 flags、锚点、实际相机、投影、绘制前二次读回与轨迹。准备/校色记录不分配成功 frameId；诊断复制失败不影响已成功绘制。

## 验收证据与覆盖边界

| 项目 | 实际检查 | 证据 |
| --- | --- | --- |
| V1 | 两桥 76 个位置（各 38）覆盖指定关键点和 ±.001 邻点；按实际 GLB accessor 时长及固定采样公式独立计算 action 秒数。五段分别在两个顺序创建的新 context/新解析 GLB 中做 direct-vs-mixed-history 配对，含 Work、倒滚和随机定位；实际动作、30 节点、载体/材质和相机比较 | `bridge-frames.json`、`fresh-history.json`、A 真实 GLB 动画回归 |
| V2 | 实际锚点+actual camera 独立重投影，读取 computed DOMMatrix 映射页面四角，不用 bbox；source/target 同检。viewport≠page 尺寸及 near/退化由手算单测覆盖；DOM/pass 后动作与节点二次读回相等 | `archiveCameraProjection.test.ts`、桥帧记录、浏览器报告 |
| V3 | 唯一 mixer 结构约束、prepare/foreground 许可失效、旧 token 拒写；真实预热、entry、重叠桥、rest、Index 检视关闭、跨 Work、书签与恢复路径 | A/coordinator 单测、浏览器轨迹及接线断言 |
| V4 | About/Life/Frame 书签、返回 entry .48 / AL/LF .56；同章第二请求、wheel 后新请求、Frame cuisine 深链、Index pendingScroll 取消、外章往返 | 浏览器命名用例 |
| V5 | viewport resize 维持 T；真实 WEBGL_lose_context loss/restore；恢复等待中从 About 桥跳 Frame，最终提交最新 request/resourceGeneration；load 触发内容增高与 visibility 生命周期另有定点用例 | 浏览器命名用例及报告 |
| V6 | 实际 GLB HTTP 响应内存夹具删 clip、改节点名、改父关系；非法页面投影、真实 GL draw 抛错；冲突/抛错诊断槽、序列化异常、默认关闭。失败检查最终 canvas 隐藏、hit 禁用、正文可读，非仅检查日志 | 浏览器报告；未知 channel、重复通道与无部分写由 A/B 保护测试覆盖 |
| V7 | C 原三项；真实 Index、entry 纸页与 About 首屏文案逐字映射，完整正文四块可见；Final Horizon→Stack、Work/Contact；reduced 与 390px 窄屏不创建房间 canvas | 回归截图与浏览器报告 |

数值容差没有放宽：action 秒数/weight/timeScale 1e-6；位置/锚点 1e-5m；scale 1e-6；四元数角度 1e-5rad；FOV 1e-5°；矩阵 1e-6；CSS 四角 0.5px。浏览器滚动输入另允许 1.1 CSS px/桥高度的离散落点误差，oracle 使用实际落点，不以此放宽输出误差。fresh-history 的完整节点数据直接深相等，camera 数组按更严格的对应数值阈值比较。

这里不是对每个可能位置逐一新建浏览器的穷举证明：新 context 配对是五个代表位置，关键点全覆盖使用同一页面的实际读回及独立 oracle；A 的真实二进制动画测试另覆盖更密集的乱序/反向。非零 pointer 输入序列未单独做跨 context 等价性实验。visibility 用例为真实浏览器内注入 hidden 状态与事件的生命周期测试，不冒称 OS 后台标签计时实测。

## 实际检查命令

工作目录 `apps/landing`；命令均经 RTK 执行。最终详细输出见 `output/pm/NR-02B/checks.txt` 和 Playwright `browser-final.json`。

最终冻结候选浏览器：22/22 PASS，0 skipped/unexpected/flaky，294.038 秒，退出 0。开始时间 `2026-09-09T12:10:26.596Z`；`final-files.json` 于该轮开始前 0.54 秒生成，结束后 24 个产品/测试文件全部重核一致。4297 已无 listener（lsof 退出 1、空输出）。此前 20 项轮次的结果不冒充此冻结版本；该轮 22 项结果已取代它。前述 40 项单测先于最后 foreground-owner/校色记录细化，细化后的源码由最终完整 TypeScript/build 和浏览器轮次覆盖；本次未因 PM 冻结而再重复单测。

- `node --test tests/archiveExecution.test.ts tests/archiveSamplePosition.test.ts tests/archiveCameraProjection.test.ts tests/archiveAnimationRig.test.ts tests/archiveStoryShadow.test.ts tests/archiveBindingContract.test.ts tests/narrativeObjects.test.ts tests/sampleStory.test.ts tests/narrativeSpec.test.ts`：40/40，退出 0，无跳过。
- `npx tsc -b`：完整 solution，退出 0。
- `npx eslint`：白名单 23 个 TS/TSX 文件，退出 0。
- `git diff --check`：退出 0。
- `node output/pm/NR-02B/verify-scope.mjs`（仓库根）：24 文件清单，12/12 保护指纹一致，资产/内容/依赖/配置 tracked diff 空，退出 0。
- 系统 Google Chrome，原 Playwright 配置，单 worker，临时端口 4297，原 build+preview。默认 Desktop Chrome 1280×720/DPR1；resize 1376×850；C 1440×900；窄屏 390×844。没有操作 tim 的 5173 服务。

正常构建仍提示 mediaCache 的静态/动态混合导入及 chunk 超 720kB；没有为消除提示修改配置。旧几轮失败包括 computed transform 的 2D/3D 序列化假设、跨 evaluate 闭包漏传参数、记录中 preparation 无 position、注入故障前分开读取造成多一帧；这些取证问题已修正，产品输出容差不变。PM 指出的失败后无条件 visible/ready 为真实产品缺陷，已用本次 DrawResult 和失败浏览器用例闭合。

## 源码结构断言迁移

| 原约束位置 | 等价/增强证据 |
| --- | --- |
| runtime/lab 直接 `claim('legacy')`，Director 四参数持 rig/token | runtime/lab 构造唯一 rig；coordinator `rig.claim(next)`；Director 只接 actionNames；coordinator 不创建 mixer/action；lab 通过 execution.begin/legacy 后求相机并 finally 释放 |
| C 在旧 draw 的 render/shader 后观察 | 仍仅一处 `storyShadow.observe` 且在 render/shader 成功后；新增整体 legacy mode gate；sample 区段不得调用旧 pose/navigationPose 或 C hook |
| C 三项浏览器隔离 | 仅 URL 改为 `?archiveSample=legacy`；原正常计数、初始化冲突、真实 renderer failure 断言保留 |

A 的真实动作/节点/无效绑定/token 行为断言以及 C 的采样/初始化/读回故障隔离行为断言没有删改。

## 视觉、限制与回退

已查看 `index.png`、`entry-book.png`、`about-opening.png`、`about-content.png`、`frame-arrival.png`、`frame-stack.png`、`projects.png`、`contact.png`。真实内容存在且可读；entry .96 仍处于原纸面透视展开，Work/Contact 保留其原图文效果。这些观察不等于 tim 的画面/节奏认可。技术交付、PM 接受、tim 视觉接受和生产发布分别记录；tim 视觉验收仍 PENDING。

照片明确为 `endpoint-switch-v1`：LF travel 完成时切换原有两个载体，`transferGeometryApplied=false`；未实现连续转移曲面，也未开展 NR-03/美术/音效。未跑 lab 全量 raycast 扫描、整站无关 E2E、跨 GPU 像素一致性或全面性能基准。不能据本报告宣称全站推广完成。

快速停用：整页重新加载 `?archiveSample=legacy`，不是热切换，也不是执行器完整回退。完整回退只能撤本卡增量：`baseline.json` 保存 14 个原有文件的精确起始内容；7 个本卡新文件可在确认后移除；PM 追加的 lab/A/C 三个既有文件记录了接受版起始 hash，但没有伪造其内容备份，需按审阅过的反向差异恢复并核对该 hash。不得按 HEAD 覆盖，因为接受的 NR-01/A 也未提交。报告和证据保留，现有其他未提交增量不动。
