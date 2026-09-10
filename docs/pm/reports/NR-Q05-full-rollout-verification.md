# NR-Q05 全站技术闭环独立验收

```yaml
task_id: NR-Q05
card: docs/pm/cards/NR-Q05-full-rollout-verification.md
status: DELIVERED
qa_verdict: PASS
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-05/pm-candidate-files.json
  candidate_fingerprint_before: PASS (59/59)
  candidate_fingerprint_after: PASS (59/59)
```

## 当前独立浏览器证据

| 技术边界 | 结果 | 证据 |
| --- | --- | --- |
| 13 段统一 sample 链与当前 T 重建 | PASS | 当前 QA `qa-front-nine-current-samples.json` 记录前九段 17 个样本：Index/entry/frame-stack/stack-reading 为 `.001/.5/.999`，其余为中点；`qa-front-nine-current-endpoints.json` 补齐其余五段 `.001/.999`，共 27 个前九段位置。均为 11 actions、有限 camera、同一八阶段 trace；`frame-stack/.5` fresh 与扰动历史后相等。当前 `work-contact-samples.json` 记录后三段各 `.001/.5/.999`，Contact 受物理页尾限制只记录真实 `0`。 |
| Contact 物理边界 | PASS | 实测 `contact-reading=[34191,34192]`、`maxScroll=34191`、实际 `scrollY=34191`；没有伪造 `.5/1` 浏览器位置。Contact 正文与 CTA 在 `contact-reading.png` 中可见，仅作功能观察。 |
| Work/Contact 直达、返回、书签、六项目 | PASS | `archive-rollout` 的直接路由/返回用例独立通过：Work 的 6 个项目、Contact 两 CTA、两个 bookmark、无旧 iris、无滞后回调重写。 |
| GPU/布局/最新请求 | PASS | `archive-rollout` GPU 用例独立通过：真实 WebGL loss 后的新 Contact 请求在新的资源代次提交，owner 仍为 sample；末四段 history-independent 用例同时覆盖相邻段反向/直达语义。 |
| 全站贯穿与案例焦点 | PASS | Index→About/Life/Frame→Stack/Work/Contact 的当前 T 取样在上表覆盖；`projects-experience` 的 case study 用例独立通过，确认焦点约束、Lenis 暂停/释放、关闭后触发器恢复。 |
| 早期真实 GLB 绑定失败 | PASS | `qa-early-work-anchor-reading-fallback.json`：真实 GLB JSON 内存重打包移除 `WorkReading_TL`，响应拦截成功；intro 退出、archive `data-failed=true`、共享 canvas `0`、无 diagnostic 对象，六章均可读，About 714 字，之后 Frame/Work 可导航。 |
| 永久 renderer 失败 | PASS | `archive-shadow` 的实际 renderer throw 用例独立通过：failed 后帧号冻结、共享画布不重显，旧 shadow/legacy 查询也不分叉生产 sample。 |
| 前段照片与深 Frame 返回 | PASS | `archive-photo-return` 的 Frame pinned subtheme 最后簇/快照/书签用例独立通过；范围只作受末段推广影响的回归抽查。 |
| Loader 与降级政策 | PASS（现行政策） | reduced-motion、WebGL unavailable、正常 loader handoff、非 Archive bounded visual failure 阻止 handoff 各独立通过。后者显示 `Preparation incomplete` 与 retry，符合非 Archive 必需资源仍阻塞；GLB 单一 renderer 失败则由上一行的 reading fallback 例外放行。 |

## 明确未绿的旧政策冲突

完整 degradation 不能表述为全绿。卡片所指四 spec 组合是 **13/15**，其中 degradation 选择 6 条为 **4/6**，其余 Archive 三组为 9/9；不是“degradation 15 条”。保留的两条旧测试未改、未 skip，且与当前授权政策相冲突：Frame 图片 404 后仍入场，以及缺失 Liquid Metal 后进入已删除的桌面 Work gate。它们不构成本卡产品 FAIL，也不被本报告记为通过。

## 实际命令与结果

| 独立运行 | 结果 |
| --- | --- |
| `archive-rollout`: last four / Work-Contact routes / GPU latest | PASS 1/1、1/1、1/1；34.7s、17.4s、13.7s |
| QA front-nine current samples / remaining endpoints | PASS 1/1、1/1；44.4s、33.6s |
| early Work anchor GLB reading fallback | PASS 1/1；10.6s |
| actual renderer throw / retired shadow isolation | PASS 1/1、1/1；11.0s、17.3s |
| Frame deep return / project case focus / reduced motion | PASS 1/1、1/1、1/1；21.0s、10.8s、9.4s |
| WebGL unavailable / normal loader / non-Archive blocking | PASS 3/3；16.2s |

一次原始前九段全局长历史用例在 QA 隔离 cwd 中异常长时间未给出结束结果，已中断且不计入结论；随后以当前候选上的两个更小、完整留档的前九段读回用例替代。没有观察到产品断言失败或环境阻塞。

端口 `4333–4345` 已无监听，未启动或影响 5173。PM独立提供的 tsc/lint/守卫/单测记录仅作交叉背景，本 QA 结论以以上当前浏览器实测为依据。

## 结论与非技术边界

在现行 Loader 资源政策下，NR-Q05 的全站统一运行时、最后四段、退路、请求所有权、早期绑定失败和受影响前段回归均已技术通过，QA 结论为 **PASS**。

这不是 tim 对全站构图、镜头节奏、美术精修或公开发布的最终接受；跨浏览器、GPU、DPR 的像素一致性也不属于本卡结论。
