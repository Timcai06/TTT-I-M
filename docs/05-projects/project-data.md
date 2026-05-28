# 作品数据

**文件**: `src/data/projects.ts`

## 接口定义

```typescript
export interface Project {
  id: string          // 唯一标识
  index: string       // 序号 ("01" ~ "06")
  name: string        // 英文名称
  cnTitle: string     // 中文标题
  tagline: string     // 一句话副标题
  description: string // 详细描述
  stack: string[]     // 技术标签
  highlights: string[] // 亮点列表 (3 条)
  year: string        // 年份
  github: string      // GitHub 链接
  live?: string       // 线上 Demo（可选）
  accent: string      // 卡片强调色
}
```

## 作品列表

### 01. BDI · Infra Scan

| 字段 | 值 |
|------|----|
| 中文 | 桥梁巡检 AI 系统 |
| 描述 | 面向无人机桥梁巡检场景的 AI 识别系统原型，国家三等奖作品 |
| 技术 | Next.js 16, FastAPI, YOLOv8-seg, Tailwind, Python 3.12 |
| 色彩 | `#6b8fb5` |

### 02. doc-for-agent

| 字段 | 值 |
|------|----|
| 中文 | 多代理仓库文档技能包 |
| 描述 | 面向 Claude Code / Codex / Continue / Copilot 的多代理仓库文档技能包 |
| 技术 | Node CLI, pipx, Codex, Claude Code, i18n |
| 色彩 | `#d6c5a8` |

### 03. Earnlytics

| 字段 | 值 |
|------|----|
| 中文 | 美股财报 AI 分析平台 |
| 描述 | AI 驱动的美股科技公司财报分析平台，RAG 多轮对话，30 家公司 109 份财报 |
| 技术 | Next.js 16, Supabase, pgvector, DeepSeek, Cohere, Vercel |
| 色彩 | `#9ab5d6` |
| Live | [earnlytics-ebon.vercel.app](https://earnlytics-ebon.vercel.app) |

### 04. SPM

| 字段 | 值 |
|------|----|
| 中文 | —— |
| 描述 | 私下打磨中的 Python 项目 |
| 技术 | Python |
| 色彩 | `#5e6470` |

### 05. 霍尔木兹封锁油价模型

| 字段 | 值 |
|------|----|
| 中文 | 数学建模 A 题 |
| 描述 | 浙江工商大学 2026 数学建模 A 题，霍尔木兹封锁对油价影响建模 |
| 技术 | Python, R, LaTeX, Ridge, ARIMA, GARCH, 蒙特卡洛 |
| 色彩 | `#c98f6b` |

### 06. Formula Lab

| 字段 | 值 |
|------|----|
| 中文 | 公式识别 Mission Control |
| 描述 | 航天控制中心风 · 异步 OCR 工作站，上传图片转 LaTeX |
| 技术 | Django, Celery, Redis, PostgreSQL, PaddleOCR, KaTeX, Docker |
| 色彩 | `#a8b5b8` |
