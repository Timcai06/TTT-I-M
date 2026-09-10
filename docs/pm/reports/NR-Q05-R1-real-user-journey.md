# NR-Q05-R1 真实连续用户流程补证

```yaml
task_id: NR-Q05-R1
card: docs/pm/cards/NR-Q05-R1-real-user-journey.md
status: DELIVERED
qa_verdict: FAIL
baseline:
  checkout: /Users/tim/DEV/TTT I'M/portfolio
  branch: feat/narrative-kernel
  head: 55c08029051b11e9687d869747907e20291940fa
  candidate_manifest: output/pm/NR-05/pm-candidate-files.json
  candidate_fingerprint_before: PASS (59/59)
  candidate_fingerprint_after: PASS (59/59)
```

## 可复现阻断

一个正常启动、未 reload/reset 的桌面页面按可见操作执行：Index 点击 → About 导航 → About 长文滚动 → `RETURN TO OBJECT` → 小步真实滚轮。滚动记录 [qa-about-to-life-wheel-debug.json](/Users/tim/DEV/TTT%20I%27M/portfolio/output/pm/NR-Q05-R1/qa-about-to-life-wheel-debug.json) 显示页面从 `scrollY 2580` 连续前进至 `8040`；`5399/5640/5880/6100` 时 Life 已成为非 inert 的可读区，之后继续滚动才越过它。因此此前固定大滚轮未进入 Life 是脚本越界，不是产品结论。

为在正确区间进入 Life，QA 停在可见且 enabled 的 `button[aria-label="打开 life"]`（`[data-archive-track="about-life"] .archive-bridge__room-hit`）后执行真实点击。该点击在 120 秒内无法送达：Playwright 的真实命中检查反复记录 **`.archive-bridge__stage` intercepts pointer events**；按钮本身可见、enabled、`tabindex=0`，但被舞台层覆盖。原始失败上下文与截图保留于：

`output/pm/NR-Q05-R1/test-results/qa-real-user-journey-QA-R1-3e554-rame-Stack-Work-and-Contact-chromium-desktop/error-context.md`

这阻断了卡片要求的单页连续路径在 About→Life 的真实物件入口处继续进入 Frame、Stack、Work、Contact 和书签返回。QA 未使用 `force` 点击、DOM click/evaluate、sample 调用、诊断 T 或程序滚动定位绕过该问题。

## 已完成的真实步骤

- 正常 loader 退出；可见 Index 已点击进入。
- 可见 About 导航、长文滚动与未改样式截图已完成。
- `RETURN TO OBJECT` 已完成。
- 小步真实滚轮到 Life 可读区的 DOM/滚动状态已留档。

## 结论

本卡结论为 **FAIL**：现有专项测试通过不能替代真实连续用户旅程，且 About→Life 的可见房间入口实际被舞台层拦截。该报告不扩大为视觉、美术或发布判断；它是一个可复现的交互层技术缺陷。端口 4346–4351 已核无监听，5173 未动。
