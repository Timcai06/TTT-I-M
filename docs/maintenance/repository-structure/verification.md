# 逐批验证

在 `portfolio-repo-structure` / `chore/repo-structure` 运行。Node v25.8.1、npm 11.11.0；依赖由该 worktree 独立 `npm ci` 安装，使用原锁文件。

每批执行 `npm run typecheck`、`npm run lint`、`npm run test:unit`、`npm run test:build`，命令经 `rtk proxy` 调用。`test:build` 包含 Landing 生产构建、10 个 Landing build guards、内容测试与根 platform guard。

| 批次 | typecheck | lint | unit | build guards |
| --- | --- | --- | --- | --- |
| 1A | [PASS](../../../output/repository-structure-round1/1A-typecheck.log) | [PASS](../../../output/repository-structure-round1/1A-lint.log) | [PASS (30 + 5 + 220)](../../../output/repository-structure-round1/1A-test-unit.log) | [PASS](../../../output/repository-structure-round1/1A-test-build.log) |
| 1B | [PASS](../../../output/repository-structure-round1/1B-typecheck.log) | [PASS](../../../output/repository-structure-round1/1B-lint.log) | [PASS (30 + 5 + 220)](../../../output/repository-structure-round1/1B-test-unit.log) | [PASS](../../../output/repository-structure-round1/1B-test-build.log) |
| 1C | [PASS](../../../output/repository-structure-round1/1C-typecheck.log) | [PASS](../../../output/repository-structure-round1/1C-lint.log) | [PASS (30 + 5 + 220)](../../../output/repository-structure-round1/1C-test-unit.log) | [PASS](../../../output/repository-structure-round1/1C-test-build.log) |
| 2A | [PASS](../../../output/repository-structure-round1/2A-typecheck.log) | [PASS](../../../output/repository-structure-round1/2A-lint.log) | [PASS (30 + 5 + 220)](../../../output/repository-structure-round1/2A-test-unit.log) | [PASS](../../../output/repository-structure-round1/2A-test-build.log) |
| 2B | [PASS](../../../output/repository-structure-round1/2B-typecheck.log) | [PASS](../../../output/repository-structure-round1/2B-lint.log) | [PASS (30 + 5 + 220)](../../../output/repository-structure-round1/2B-test-unit.log) | [PASS](../../../output/repository-structure-round1/2B-test-build.log) |
| 3 | 待执行 | 待执行 | 待执行 | 待执行 |

Unit 数量依次为 content、Studio、Landing。原始日志位于这个 worktree 的 `output/repository-structure-round1/`，被 Git 忽略但保留用于交付；以上链接在该 worktree 可打开，不是新环境自动具备的文件。

## 非阻塞警告与范围

Lint 在基点已有下列警告；本轮不改该组件生命周期：

```text
apps/landing/src/components/personal-archive/ArchiveIndexSurface.tsx
  35:6  warning  React Hook useCallback has a missing dependency: 'root'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

✖ 1 problem (0 errors, 1 warning)
```

Vite 保留已有的超过 500 kB chunk 提示。所有构建均使用相同预算与守卫；没有通过放宽预算或跳过检查取得通过。

未运行历史建模、模型导出、Blender 保存、浏览器 E2E 或视觉验收。目录迁移不改变素材 URL、视觉参数或节点名称；保护文件另做 SHA-256 对比。

## 修正记录

1B 的四类检查均通过。额外 `git diff --check` 曾发现新 TSV 使用 CRLF；已转为 LF 并在 1B 本地提交中修正，复查通过。原始诊断如下：

<details>
<summary>原始 whitespace 诊断（完整）</summary>

```text
docs/maintenance/repository-structure/unresolved-historical-links.tsv:1: trailing whitespace.
+source	link	resolvedTarget	reason
docs/maintenance/repository-structure/unresolved-historical-links.tsv:2: trailing whitespace.
+art/personal-archive/README.md	source/tim-cai-personal-archive.blend	art/personal-archive/source/tim-cai-personal-archive.blend	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:3: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/baseline-reconciliation.json	output/pm/NR-00/baseline-reconciliation.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:4: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/baseline-start.json	output/pm/NR-00/baseline-start.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:5: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/glb-structure.json	output/pm/NR-00/glb-structure.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:6: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/object-bindings.json	output/pm/NR-00/object-bindings.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:7: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/source-index.json	output/pm/NR-00/source-index.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:8: trailing whitespace.
+docs/pm/reports/NR-00-contract.md	../../../output/pm/NR-00/baseline-end.json	output/pm/NR-00/baseline-end.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:9: trailing whitespace.
+docs/pm/reports/NR-04-delivery.md	../../../output/pm/NR-04/global-story-samples.json	output/pm/NR-04/global-story-samples.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:10: trailing whitespace.
+docs/pm/reports/NR-04-delivery.md	../../../output/pm/NR-04/frame-stack-final-horizon.png	output/pm/NR-04/frame-stack-final-horizon.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:11: trailing whitespace.
+docs/pm/reports/NR-04-delivery.md	../../../output/pm/NR-04/stack-reading.png	output/pm/NR-04/stack-reading.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:12: trailing whitespace.
+docs/pm/reports/NR-04-delivery.md	../../../output/pm/NR-04/final-files.json	output/pm/NR-04/final-files.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:13: trailing whitespace.
+docs/pm/reports/NR-04-delivery.md	../../../output/pm/NR-04/rollback-status.json	output/pm/NR-04/rollback-status.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:14: trailing whitespace.
+docs/pm/reports/NR-Q02-R1-recheck.md	../../../output/pm/NR-Q02-R1/qa-transient-projection-recovery.json	output/pm/NR-Q02-R1/qa-transient-projection-recovery.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:15: trailing whitespace.
+docs/pm/reports/NR-Q02-R1-recheck.md	../../../output/pm/NR-Q02-R1/qa-r1-life-frame-recovered.png	output/pm/NR-Q02-R1/qa-r1-life-frame-recovered.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:16: trailing whitespace.
+docs/pm/reports/NR-Q02-R1-recheck.md	../../../output/pm/NR-Q02-R1/qa-transient-projection-recovery.png	output/pm/NR-Q02-R1/qa-transient-projection-recovery.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:17: trailing whitespace.
+docs/pm/reports/NR-Q02-R1-recheck.md	../../../output/pm/NR-Q02-R1/qa-independent-flow.json	output/pm/NR-Q02-R1/qa-independent-flow.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:18: trailing whitespace.
+docs/pm/reports/NR-Q02-R1-recheck.md	../../../output/pm/NR-Q02-R1/qa-gpu-latest-about.json	output/pm/NR-Q02-R1/qa-gpu-latest-about.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:19: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-transient-projection-recovery.json	output/pm/NR-Q02/qa-transient-projection-recovery.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:20: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-transient-projection-recovery.png	output/pm/NR-Q02/qa-transient-projection-recovery.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:21: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-independent-flow.json	output/pm/NR-Q02/qa-independent-flow.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:22: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-about-long.png	output/pm/NR-Q02/qa-about-long.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:23: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-about-object.png	output/pm/NR-Q02/qa-about-object.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:24: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-gpu-latest-about.json	output/pm/NR-Q02/qa-gpu-latest-about.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:25: trailing whitespace.
+docs/pm/reports/NR-Q02-sample-verification.md	../../../output/pm/NR-Q02/qa-gpu-latest-about.png	output/pm/NR-Q02/qa-gpu-latest-about.png	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:26: trailing whitespace.
+docs/pm/reports/VR-Q01-R1-final-review.md	../../../output/pm/VR-Q01-R1/review-evidence.md	output/pm/VR-Q01-R1/review-evidence.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:27: trailing whitespace.
+docs/pm/reports/VR-Q01-R1-final-review.md	../../../output/pm/VR-03-R1/pm-frozen.json	output/pm/VR-03-R1/pm-frozen.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:28: trailing whitespace.
+docs/pm/reports/VR-Q01-R2-final-review.md	../../../output/pm/VR-Q01-R2/review-evidence.md	output/pm/VR-Q01-R2/review-evidence.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:29: trailing whitespace.
+docs/pm/reports/VR-Q01-R2-final-review.md	../../../output/pm/VR-03-R2/pm-frozen.json	output/pm/VR-03-R2/pm-frozen.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:30: trailing whitespace.
+docs/pm/reports/VR-Q01-final-review.md	../../../output/pm/VR-Q01-final/pre-r1-review-evidence.md	output/pm/VR-Q01-final/pre-r1-review-evidence.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:31: trailing whitespace.
+docs/pm/reports/VR-Q01-final-review.md	../../../output/pm/VR-03/pm-frozen.json	output/pm/VR-03/pm-frozen.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:32: trailing whitespace.
+docs/pm/reports/VR-Q01-technical-review.md	../../../output/pm/VR-Q01/review-evidence.md	output/pm/VR-Q01/review-evidence.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:33: trailing whitespace.
+docs/pm/reports/VR-Q01-technical-review.md	../../../output/pm/VR-01/pm-accepted-files.json	output/pm/VR-01/pm-accepted-files.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:34: trailing whitespace.
+docs/pm/reports/VR-Q01-technical-review.md	../../../output/pm/VR-02A/pm-accepted.json	output/pm/VR-02A/pm-accepted.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:35: trailing whitespace.
+docs/pm/reports/VR-Q01-technical-review.md	../../../output/pm/VR-02B/pm-accepted.json	output/pm/VR-02B/pm-accepted.json	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:36: trailing whitespace.
+tools/personal_space/legacy/README-history.md	../../docs/landing/delivery/model-review.md	tools/docs/landing/delivery/model-review.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:37: trailing whitespace.
+tools/personal_space/legacy/README-history.md	../../docs/landing/experience/spatial-narrative.md	tools/docs/landing/experience/spatial-narrative.md	preexisting missing local target; retain logical mapped target
docs/maintenance/repository-structure/unresolved-historical-links.tsv:38: trailing whitespace.
+tools/personal_space/legacy/README-history.md	../../docs/landing/assets/personal-space.md	tools/docs/landing/assets/personal-space.md	preexisting missing local target; retain logical mapped target
```

</details>
