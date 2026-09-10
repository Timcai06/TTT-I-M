# NR-05-R4 · Contact 遗留项目画面定位与清理

**READY，2026-09-10。DEV沿用当前模型；QA已停止61候选，DEV唯一产品写入者。先确证绘制源，再做必要最小修复。**

当前 `output/pm/NR-05-R3/pm-candidate-files.json` 61文件、`pm-candidate-source.json` 60完整文本。NR-Q05-R3真实全站旅程、Life快速点击、书签/RETURN和取消均通过；PM实际查看Contact截图发现EduCanvas项目图遮住Contact标题/第二个CTA。QA只检查了scroll三次稳定、route-layer=0、dialog=0及CTA hit ownership，没有等待/检查全部媒体退出生命周期，也没有证明画面来自哪个节点。不能凭“矩形overlap”归因：QA列表中的Contact复制层父opacity=0，本身z-index10000不证明可见。

读 `NR-Q05-R3-navigation-closure.md`、`output/pm/NR-Q05-R3/journey-contact-settled.png` 与 `qa-r3-contact-settled.json`。

## 先确认

复现真实Work案例开关→Contact。等待真实路由、dialog、ParticlePortal等有限退出完成，连续检查媒体自身rect/opacity/挂载状态；scroll稳定不等于画面稳定。匹配EduCanvas实际src/canvas渲染来源，记录完整祖先链、有效opacity/visibility（包含祖先）、所处章节与portal容器。

若只是截图截在既有合法退出动画中、退出后无遮挡，保存最终无遮挡截图和生命周期证据，无需改产品。若退出后仍有旧项目图，定位拥有该输出的组件，修复它在离开Work/案例后释放或隐藏输出及恢复条件。不得删除正常Work效果、全局压低canvas或覆盖Contact遮掩根因。

## 必要写入范围

仅确由以下模块负责时可最小修改：
- `apps/landing/src/components/effects/CanvasUiHtmlSurface.tsx`
- `apps/landing/src/components/effects/ProjectGlassSurface.tsx`
- `apps/landing/src/chapters/projects/useProjectMediaMode.ts`
- `apps/landing/src/chapters/projects/Projects.tsx`
- `apps/landing/src/components/personal-archive/archiveReadingSurface.ts`
- 可新增 `apps/landing/tests/e2e/archive-media-ownership.spec.ts`。

先保存所有新增范围修改前完整原文和hash；部分文件不在61清单内，不能遗漏。其他真正责任文件需说明扩边界；禁止修改第三方vendor、GLB/素材、相机、设计色彩、既有内容、资源策略。

## 验收

- 同页真实案例关闭→Contact，媒体生命周期结束后标题、两个CTA无遮挡且点击命中正常；保留未改样式截图，禁止只看DOM存在/数量/elementFromPoint（pointer-events:none图层依然会遮画面）。
- 回Work能正常看到项目媒体、打开关闭案例；新请求/取消不恢复旧项目输出到Contact。
- 不重跑已过全站采样/资产/全单测；必要类型、限域lint和受影响真实浏览器回归。若无产品修改，明确只补证。
- 报告 `docs/pm/reports/NR-05-R4-delivery.md`，证据 `output/pm/NR-05-R4/`，准确记录来源/退出时序、失败与最终结果、保护指纹及完整原文；停止后PM交QA定点复核，不再重复整条已通过旅程除非修复实际影响它。自有空闲端口并清理，禁止触碰5173。

此卡是内容遮挡/输出所有权技术边界，不进行视觉精修、最终收尾或发布；不提交推送。


**PM最终状态（2026-09-10）：本卡已关闭。** 全站技术推广已接受，见 `docs/pm/reports/NR-05-pm-acceptance.md`；历史READY为派发记录，不能据此重启。视觉精修、最终收尾与发布等待tim新指示。
