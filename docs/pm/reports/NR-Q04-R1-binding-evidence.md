# NR-Q04-R1 缺失绑定浏览器退路补证

```yaml
task_id: NR-Q04-R1
card: docs/pm/cards/NR-Q04-R1-binding-evidence.md
status: DELIVERED
qa_verdict: PASS
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-04/pm-candidate-files.json
  candidate_fingerprint_after: PASS (50/50)
```

## 当前补证

`tests/e2e/archive-execution.spec.ts` 的真实 GLB 内存重打包 `clip/node/parent` 三项，在实际 `apps/landing` cwd、隔离端口 4331、系统 Chrome 下通过 **3/3**（22.2s）。该测试读取真实 GLB、重写 JSON 块长度及总长度、只拦截浏览器模型响应，不写磁盘资产。

QA 另以同一重打包机制记录 node 缺失路径，输出：[qa-real-missing-node-binding-fallback.json](/Users/tim/DEV/TTT%20I%27M/portfolio/output/pm/NR-Q04-R1/qa-real-missing-node-binding-fallback.json)。实际字段为：

| 字段 | 实测值 |
| --- | --- |
| 被替换节点 | `PhotoMount_04 → FaultMissingPhotoMount` |
| 原 GLB / 重打包 GLB | `22,891,272` / `22,891,280` bytes |
| 拦截 | `true` |
| `execution-error.reason` | `Missing archive node:PhotoMount_04` |
| `sample-committed` 数 | `0` |
| renderer 状态 | `ready` |
| canvas 可见性 | `hidden` |
| sample fallback | `true` |
| About 正文 | `714` 字，非 inert |
| resize + 新 Frame 请求后 | 仍为 fallback，未出现 sample commit |

因此，renderer 的 `ready` 仅表示资源可用；它没有否定永久 sample 拒绝。缺失节点后，运行时正确阻止部分 action/sample 提交，并保持原始可读正文。此前 NR-Q04 将该状态误归为“注入未生效”，该结论由本补证纠正。

## 边界

本卡只补永久绑定失败退路；NR-Q04 已通过的全局导航、恢复、照片、阅读和 Final Horizon 项目未重跑。候选清单最终仍为 50/50 指纹一致。端口 4331–4332 已无监听，5173 未启动。技术补证为 **PASS**，不代替 tim 的视觉、节奏或发布判断。
