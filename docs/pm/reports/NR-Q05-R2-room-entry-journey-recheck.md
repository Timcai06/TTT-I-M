# NR-Q05-R2 房间入口与真实旅程复核

```yaml
task_id: NR-Q05-R2
card: docs/pm/cards/NR-Q05-R2-room-entry-journey-recheck.md
status: DELIVERED
qa_verdict: FAIL
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-05-R1/pm-candidate-files.json
  candidate_fingerprint_before: PASS (60/60)
  candidate_fingerprint_after: PASS (60/60)
```

## 原反例复核

正常生产启动、无 reload/reset/诊断 T 驱动的单页流程到达 About→Life 房间入口：

1. 可见 Index 点击；可见 About 导航与长文滚动；`RETURN TO OBJECT`。
2. 小步真实滚轮到当前可见 `button[aria-label="打开 life"]`。
3. 读取投影 `clip-path` 多边形质心，`elementFromPoint` 确认质心现在由该按钮自身拥有（不再是 `.archive-bridge__stage`）；按钮可见、enabled，`pointer-events:auto`。
4. 对该真实物件内部质心执行普通 `page.mouse.click(x,y)`，未使用 force、DOM event/evaluate click、sample 或 T 定位。

层级修复部分 **PASS**：原 R1 的 sticky stage 指针拦截不再出现。

但正常生产页面中该普通鼠标点击后，`#life` 持续 `inert` 超过 10 秒；真实 Life 阅读没有打开。因此完整单页路径不能继续 Frame、Stack、Work、Contact 和书签返回，整体结论仍为 **FAIL**。

失败输出保留于 `output/pm/NR-Q05-R2/test-results/`；失败位置为 `qa-room-entry-journey.spec.ts:16` 的真实点击后 Life 可交互断言。此前 DEV 的 `archive-room-entry.spec.ts` 使用 `__portfolioArchiveExecutionEnabled` 测试模式并通过，不能替代本卡要求的正常生产页面连续旅程。

## 范围与清理

未重跑 R1 之外的 GPU、绑定、几何或静态套件。候选 60/60 前后指纹一致，端口 4352–4354 无监听，5173 未触碰。

此为实际交互/进入链技术缺口，不涉及 tim 的视觉或发布判断。
