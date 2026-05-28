export interface Project {
  id: string
  index: string
  name: string
  cnTitle: string
  tagline: string
  description: string
  stack: string[]
  highlights: string[]
  year: string
  github: string
  live?: string
  accent: string
}

export const projects: Project[] = [
  {
    id: 'bdi',
    index: '01',
    name: 'BDI · Infra Scan',
    cnTitle: '桥梁巡检 AI 系统',
    tagline: '无人机桥梁病害识别工作站',
    description:
      '面向无人机桥梁巡检场景的 AI 识别系统原型，把图像输入到病害识别、结果展示、结构化导出、历史回看做成可演进的产品。',
    stack: ['Next.js 16', 'FastAPI', 'YOLOv8-seg', 'Tailwind', 'Python 3.12'],
    highlights: [
      '支持裂缝、破损、梳齿、孔洞、钢筋外露、渗水六类病害分割',
      '前端首屏 < 1s · 玻璃态 UI · 多模型对比 · 一键导出',
      'CLI 包装脚本统一前后端 / mock / 真实推理流程',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/BDI',
    accent: '#6b8fb5',
  },
  {
    id: 'doc-for-agent',
    index: '02',
    name: 'doc-for-agent',
    cnTitle: '多代理仓库文档技能包',
    tagline: 'docagent · 代理长期记忆基线',
    description:
      '面向 Claude Code / Codex / Continue / Copilot 的多代理仓库文档技能包，输出模式覆盖 agent / human / dual / quad，把生成的文档当作可维护的知识基线。',
    stack: ['Node CLI', 'pipx', 'Codex', 'Claude Code', 'i18n'],
    highlights: [
      '四视图目录契约：AGENTS / AGENTS.zh / handbook / handbook.zh',
      'Memory-first：agent 执行上下文与 maintainer 手册并行同步',
      '一行 init 启动仓库内工作流，refresh 重写文档',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/Doc-For-Agent-skill',
    accent: '#d6c5a8',
  },
  {
    id: 'earnlytics',
    index: '03',
    name: 'Earnlytics',
    cnTitle: '美股财报 AI 分析平台',
    tagline: 'AI-driven earnings analysis · 中文摘要',
    description:
      'AI 驱动的美股科技公司财报分析平台，提供中文摘要与 RAG 多轮对话。覆盖 30 家公司、109 份财报，AI 全量覆盖，月度成本 < ¥1。',
    stack: ['Next.js 16', 'Supabase', 'pgvector', 'DeepSeek', 'Cohere', 'Vercel'],
    highlights: [
      'RAG 助手：1024 维 Cohere 向量 · 多轮对话 · 动态建议',
      '23 份财报到 109 份的全自动扩展 · GitHub Actions 每 4 小时同步',
      '实时组合 + 玻璃态 UI + Web Vitals 闭环',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/Earnlytics',
    live: 'https://earnlytics-ebon.vercel.app',
    accent: '#9ab5d6',
  },
  {
    id: 'spm',
    index: '04',
    name: 'SPM',
    cnTitle: '——',
    tagline: '正在打磨中',
    description:
      '一个还在私下打磨的 Python 项目，等到我觉得它值得展示的时候，再把它的故事写在这里。',
    stack: ['Python'],
    highlights: ['Coming soon'],
    year: '2026',
    github: 'https://github.com/Timcai06/SPM',
    accent: '#5e6470',
  },
  {
    id: 'a-modeling',
    index: '05',
    name: '霍尔木兹封锁油价模型',
    cnTitle: '数学建模 A 题',
    tagline: '短期冲击 + 中长期油价调节',
    description:
      '浙江工商大学 2026 数学建模 A 题。解释为什么霍尔木兹封锁巨大供应缺口下，油价并未冲到 278-337 美元/桶的反事实基准，而是在 110-120 美元/桶形成平台。',
    stack: ['Python', 'R', 'LaTeX', 'Ridge', 'ARIMA', 'GARCH', '蒙特卡洛'],
    highlights: [
      '短期模型 RMSE 3.38 / MAE 2.76 / MAPE 2.76%，优于 ARIMA 基准',
      '中长期接入 EIA / JODI / OPEC / OVX 官方外生约束',
      '蒙特卡洛 + 16 项敏感性分析 + DM 检验 + Newey-West 校准',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/-A-',
    accent: '#c98f6b',
  },
  {
    id: 'formula-lab',
    index: '06',
    name: 'Formula Lab',
    cnTitle: '公式识别 Mission Control',
    tagline: '航天控制中心风 · 异步 OCR 工作站',
    description:
      'Linux 系统与编程实践大实验。航天单色调 UI · 异步公式识别工作台，上传图片转 LaTeX，可在论文项目工作区审校并导出 .tex / .md。',
    stack: ['Django', 'Celery', 'Redis', 'PostgreSQL', 'PaddleOCR', 'KaTeX', 'Docker'],
    highlights: [
      'PaddleOCR Formula Recognition 为默认引擎 · pix2tex 为对照',
      'Mission Progress 任务追踪 · 失败自动重试 · 持久化日志',
      'Project Workspace：识别 → 审校 → 确认 → 导出闭环',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/LinuxWeek11-Django-FormulaLab',
    accent: '#a8b5b8',
  },
]
