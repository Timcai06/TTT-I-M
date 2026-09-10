# NR-Q04-R1 · 缺失绑定浏览器退路补证

**READY，候选仍为NR04的50文件，不改产品。** QA沿用tim配置。只写 `docs/pm/reports/NR-Q04-R1-binding-evidence.md` 与 `output/pm/NR-Q04-R1/`，保留原NOT_RUN报告。

直接复用已有且在B验证过的 `tests/e2e/archive-execution.spec.ts` 的 `real GLB in-memory node fault preserves Index then degrades sample without partial action writes`；可同次带clip/parent两项，不再发明字符串替换注入。它解析真实GLB JSON、修改PhotoMount_04名称/选定clip/父级，重新序列化并更新JSON块长度与总长度，只拦截浏览器响应，绝不改磁盘资产。原测试从cwd读src/assets，使用实际landing cwd或在QA副本中仅将此文件读路径转为正确绝对路径；其余正式测试源码不修改，输出定向QA目录。

特别注意：`data-archive-state=ready` 只表示renderer资源可用，不等于sample接受能力有效。当前sampleFallback会保留renderer ready，同时永久sampleUnavailable、execution-error、画布隐藏、正文可读。验实际错误reason、fallback标志、无sample提交与原正文可用，不因ready单独判注入未生效。新Index已迁移，允许错误在初始Index采样出现，不能强求旧测试标题所写的旧Index运行方式；保持缺失绑定拒绝和可读退路的行为断言。

只补这项证据，前卡9项浏览器与静态通过不重复。候选指纹前后保持、保留实际命令/退出码与故障字段、清理自有端口并停止。若发现真实产品缺陷交PM；若注入不成立先给具体response字节与execution-error原因，不能反复盲试。
