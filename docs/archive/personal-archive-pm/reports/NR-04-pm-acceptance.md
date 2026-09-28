# NR-04 · PM技术验收

**ACCEPTED，2026-09-10。** Index/entry与Frame→Stack/Stack阅读的生产接管及全局请求/布局协议达到本卡要求，放行NR-05最后四段。用户最终视觉认可仍PENDING，不阻塞本次已授权技术推广。

实际checkout `/Users/tim/DEV/TTT I'M/portfolio`，分支feat/narrative-kernel，HEAD55c08029051b11e9687d869747907e20291940fa。DEV34文件清单匹配，未列入改动的NR03接受文件保持；合并得到 `output/pm/NR-04/pm-accepted-files.json` 50文件。`pm-accepted-source.json` 保存49份可恢复文本，GLB以固定资产指纹保护。QA完成后再次核验一致。

PM独立48项相关单元、完整 `tsc -b --pretty false`、34文件lint和diff退出0，日志 `output/pm/NR-04/pm-checks.json` 与pm-*.log。DEV报告159全单元/生产构建、新global3项、旧24/25后修About语义返回落点并4项重验；这些与PM、QA实跑分开记录，未冒称一次全部通过。

[NR-Q04](NR-Q04-global-verification.md) 的9项独立浏览器与1项静态绑定通过，覆盖新段真实采样、深链/项目子目标、Index取消、布局/GPU最新请求、NR03照片/阅读、Final Horizon身份/srcSet/实际裁切、案例关闭不抢新路由以及暂态和renderer失败。其唯一NOT_RUN缺口已由 [NR-Q04-R1](NR-Q04-R1-binding-evidence.md) 补齐：现成真实GLB clip/node/parent故障3项及单独node字段补证通过。具体PhotoMount_04缺失触发execution-error，零sample提交，renderer仍ready但canvas隐藏/fallback=true、About714字非inert，resize/新Frame请求后退路保持。renderer ready与sample能力有效不可混淆。

PM阅读了核心状态、身份解析、执行器与暂停owner接缝，审看实际屏幕/Stack图片。13段已由统一布局描述，末四段仍由明确guard交回受控legacy；世界D1全站完成要等NR05。没有把局部阅读效果改成第二套空间控制，About临时entry.pose适配已撤。

回退记录限制：NR04开工只存哈希，16份NR03接受文本后来被PM保住，其余25份较早版本未完整保留；不能承诺逐字节一键撤回NR04，须审核逆补丁。PM已按明确补充约定接受该文档缺口，并保存本次完整候选文本，后续NR05不再依赖缺失快照。此项不改变当前功能验收结果，也不隐去已发生的限制。

DEV/QA停止，4312–4332无监听；未动5173，未提交/推送/部署。后续继续NR05，视觉精修、音效、最终收尾与发布仍等tim另行指示。所有派发/续接保留用户配置，未覆盖模型/推理设置。
