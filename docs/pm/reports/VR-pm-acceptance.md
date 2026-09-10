# 本轮空间与捕获修复 · PM验收

当前状态：**ACCEPTED_TECHNICAL · WAIT_TIM_VISUAL**，2026-09-10。本轮授权修改及两轮捕获返工已完成，最终独立QA通过。DEV、ARCH、QA均停止；前端检验与效果测试交给tim。

工作区为portfolio，分支feat/narrative-kernel，HEAD 55c08029051b11e9687d869747907e20291940fa。沿用tim当前为DEV/ARCH/QA配置的模型。全站推广的既有NR结果保留；本轮仅处理tim随后授权的空间节奏、配色、开屏与HTML-in-Canvas兼容修改。

## 交付行为

- 六段3D过渡增加有效滚动距离，镜头旅行、载体对齐和正文展开按同一故事位置推进，支持停住和倒滚。直接进入/返回沿用同一展平状态，物件按故事位置复原，阅读书签独立保留。
- About、Life、Frame、Work、Contact的浅色真实阅读面及预览使用对应前景主题；Stack深色屏幕使用浅色文字。真实正文、桥接预览、返回副本共享主题。
- 移除电脑Index的旧下滑检查演示和加载面板整体上移；保留真实Index交互、加载像素表现与可读就绪条件。
- Life第三层明信片先向柜外移出，源Blend、GLB、契约与清单已同步；相机依据真实载体求位，未用遮罩掩盖几何问题。
- About捕获仅在真实可读章节启用，处理空实例、有效像素、失效回调、资源和上下文清理。
- Contact Liquid恢复为章节背景内局部指针效果；Work Laser用于真实标题，Frame粒子用于非照片标题。原始语义正文保留，不恢复旧全屏入口。
- Frame捕获副本剥离原标题揭示瞬态并验证像素；Work捕获副本内SVG引用自足，静态展开且保留照片字形缩放。Laser以真实标题判断可读资格，装饰层继续保持无障碍隐藏。修复不修改真实标题的交互与动画。

## 技术证据

| 范围 | 证据及边界 |
| --- | --- |
| 空间/模型 | VR-01有限几何采样1212点，25个源/GLB动画样本同步；PM反例复核闭合。有限采样不代表全视角视觉接受 |
| 冻结核心 | QA最初35/35文件匹配，Origin配置9项、About捕获13项独立通过；后仅chunk守卫按明确授权更新 |
| 局部效果 | PM独立11项控制/资格等检查通过；QA独立8项R1捕获及2项R2资格检查通过，并审阅Work/Contact生命周期 |
| 最终构建 | DEV最终R2 production build（含tsc-b）、增量lint/typecheck通过；QA独立运行最终8类构建守卫全部通过 |
| 来源完整性 | Decrypt/Glass既有提交逐笔审阅后同步登记；Laser/Particle受控适配明确记录，未放宽完整性守卫 |

旧NR阶段的两条资源政策E2E冲突仍保留，不称历史全套E2E全绿。本轮按tim要求未运行浏览器、Playwright、截图或前端效果测试。体积参考保持advisory。

## 正式域名与人工验收

crt-dsg.com当前跳转www.crt-dsg.com，已有公开token的origin与www匹配；Vercel Production保留既有token-only配置，无需新必填环境变量。Preview域名不冒用生产token；不支持时保留原始内容。

配置解析不验证token签名、账号注册有效期或目标Chrome资格，真实HTML-in-Canvas效果仍需在授权上线后由tim检查。公开expiry字段的2026-10-20不等于注册后台Valid Until。详见[部署说明](../../html-in-canvas-deployment.md)及[Chrome官方排障](https://developer.chrome.com/docs/web-platform/origin-trial-troubleshooting)。

前端检查顺序见[人工验收路线](VR-user-review.md)。本轮没有提交、推送、部署或操作原5173服务；最终收尾与发布仍待tim指示。

## 追溯

- [核心QA](VR-Q01-technical-review.md)
- [最终独立QA](VR-Q01-R2-final-review.md)；[R1审查与已关闭问题](VR-Q01-R1-final-review.md)
- [VR-01交付](VR-01-delivery.md)、[配置交付](VR-02A-delivery.md)、[About交付](VR-02B-delivery.md)
- [局部效果交付](VR-03-delivery.md)、[捕获返工](VR-03-R1-delivery.md)、[资格修复](VR-03-R2-delivery.md)
- 最终接受清单：output/pm/VR-final/pm-accepted-files.json，PM重算64/64当前哈希匹配；pm-accepted-source.json保存62份完整文本，Blend/GLB沿用VR-01接受的二进制副本。此为本轮范围，不是整个仓库备份。
- PM最终确认分支与HEAD未变化。
