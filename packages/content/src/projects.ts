/**
 * 项目媒体展示形态枚举。
 * - `cinematic`: 整幅照片级展示，带 4 角标记与 caption
 * - `ui`: 带浏览器 Chrome 框（地址栏 + 红绿灯圆点）的界面截图
 * - `terminal`: 终端风格 Chrome 框，标签显示 `zsh — {project-id}`
 * - `data`: 数据看板风格 Chrome 框，标签显示 `DATA READOUT`
 */
type MediaKind = 'cinematic' | 'ui' | 'terminal' | 'data'

/** 项目截图的单帧定义。多帧时通过缩略图切换器浏览。 */
interface ProjectShot {
  /** 图片路径（public 下的相对路径）。 */
  src: string
  /** 图片描述标签，用作 caption 和缩略图 alt。 */
  label: string
}

/**
 * 项目条目定义 —— Projects 组件的完整数据契约。
 * 每个项目在内容区展示为卡片：左侧文本信息 + 右侧媒体展示。
 * @dependencies Projects 组件直接消费此类型数组；`content/index.ts` 重导出供 UI 使用
 */
interface Project {
  /** 唯一标识，用于 key 和 URL hash 定位。 */
  id: string
  /** 排序序号，显示为 `01` / `02` 等。 */
  index: string
  /** 项目英文名称。 */
  name: string
  /** 项目中文名称。 */
  cnTitle: string
  /** 项目一句话标语。 */
  tagline: string
  /** 项目详细简介，支持内联 HTML（如 `<span class="...">` 高亮词）。 */
  description: string
  /** 技术栈标签列表。 */
  stack: string[]
  /** 项目亮点列表，每项一行。 */
  highlights: string[]
  /** 项目年份，显示在卡片右上角。 */
  year: string
  /** GitHub 仓库链接。 */
  github: string
  /** 在线演示链接，可选。 */
  live?: string
  /** 卡片的主题色（HEX），通过 CSS 变量 `--accent` 注入。 */
  accent: string
  /** 媒体展示配置。不存在时显示 'in the lab' 占位态。 */
  media?: {
    kind: MediaKind
    shots: ProjectShot[]
  }
}

const landingProjects: Project[] = [
  {
    id: 'bdi',
    index: '01',
    name: 'BDI · Infra Scan',
    cnTitle: '桥梁巡检 AI 系统',
    tagline: '无人机桥梁病害识别工作站',
    description:
      '面向无人机桥梁巡检场景的 AI 识别系统原型，把图像输入到病害识别、结果展示、结构化导出、历史回看做成可演进的产品，更是我们项目组的 ““ 国三 ”” 作品。',
    stack: ['Next.js 16', 'FastAPI', 'YOLOv8-seg', 'Tailwind', 'Python 3.12'],
    highlights: [
      '支持裂缝、破损、梳齿、孔洞、钢筋外露、渗水六类病害分割',
      '前端首屏 < 1s · 玻璃态 UI · 多模型对比 · 一键导出',
      'CLI 包装脚本统一前后端 / mock / 真实推理流程',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/BDI',
    accent: '#e0623a',
    media: {
      kind: 'cinematic',
      shots: [
        { src: '/projects/bdi/corrosion.webp', label: '钢筋锈蚀' },
        { src: '/projects/bdi/seepage.webp', label: '渗水监测' },
        { src: '/projects/bdi/spalling.webp', label: '混凝土剥落' },
      ],
    },
  },
  {
    id: 'pulsegraph',
    index: '02',
    name: 'PulseGraph',
    cnTitle: '本地 PyTorch 训练可观测工作台',
    tagline: '模型图、训练遥测与推理证据进入同一条运行记录',
    description:
      '面向 PyTorch 学习与调试的 local-first workbench。导入可信 .py / .zip 训练资源后，在统一链路中完成训练、SSE 遥测、模型图检查、推理复现、历史回放与运行报告。',
    stack: ['PyTorch', 'FastAPI', 'React', 'TypeScript', 'SSE', 'torch.fx'],
    highlights: [
      '训练资源 → graph / metrics / events / checkpoints / samples 的可复现实验记录',
      '实时记录 loss、accuracy、throughput、layer snapshots 与任务感知推理输出',
      'Run Library 支持历史回放、baseline / candidate 对比、诊断与报告',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/PulseGraph',
    accent: '#56c8e8',
    media: {
      kind: 'ui',
      shots: [
        { src: '/projects/pulsegraph/live-monitor.webp', label: '训练监控 · 推理与运行事件' },
        { src: '/projects/pulsegraph/training-controls.webp', label: '训练资源与模型图控制台' },
        { src: '/projects/pulsegraph/training-telemetry.webp', label: '实时训练遥测' },
        { src: '/projects/pulsegraph/inference-output.webp', label: '真实数据集推理输出' },
      ],
    },
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
    media: {
      kind: 'ui',
      shots: [
        { src: '/projects/earnlytics/landing.webp', label: 'AI 驱动的财报分析' },
      ],
    },
  },
  {
    id: 'formula-lab',
    index: '04',
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
    media: {
      kind: 'ui',
      shots: [
        { src: '/projects/formula-lab/console.webp', label: 'LaTeX 控制台' },
        { src: '/projects/formula-lab/timeline.webp', label: '识别任务时间线' },
        { src: '/projects/formula-lab/workbench.webp', label: '论文工作区' },
      ],
    },
  },
  {
    id: 'a-modeling',
    index: '05',
    name: '霍尔木兹封锁油价模型',
    cnTitle: '数学建模 A 题',
    tagline: '短期冲击 + 中长期油价调节',
    description:
      '省 2026 数学建模 A 题。解释为什么霍尔木兹封锁巨大供应缺口下，油价并未冲到 278-337 美元/桶的反事实基准，而是在 110-120 美元/桶形成平台。',
    stack: ['Python', 'R', 'LaTeX', 'Ridge', 'ARIMA', 'GARCH', '蒙特卡洛'],
    highlights: [
      '短期模型 RMSE 3.38 / MAE 2.76 / MAPE 2.76%，优于 ARIMA 基准',
      '中长期接入 EIA / JODI / OPEC / OVX 官方外生约束',
      '蒙特卡洛 + 16 项敏感性分析 + DM 检验 + Newey-West 校准',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/-A-',
    accent: '#1fb6c4',
    media: {
      kind: 'data',
      shots: [
        { src: '/projects/a-modeling/monte-carlo-tree.webp', label: '蒙特卡洛情景树' },
        { src: '/projects/a-modeling/path-cloud.webp', label: '价格路径云图' },
        { src: '/projects/a-modeling/sensitivity-tornado.webp', label: '参数敏感性龙卷风' },
        { src: '/projects/a-modeling/fitted-vs-actual.webp', label: '精修模型 vs 实际' },
        { src: '/projects/a-modeling/lagged-gpr.webp', label: 'GPR 滞后散点' },
        { src: '/projects/a-modeling/ovx-volatility.webp', label: 'OVX 隐含波动率' },
        { src: '/projects/a-modeling/return-volatility.webp', label: '收益率波动率' },
        { src: '/projects/a-modeling/residual-correction.webp', label: '短期残差校正' },
      ],
    },
  },
  {
    id: 'sciscope',
    index: '06',
    name: 'SciScope',
    cnTitle: '证据接地科研文献智能体',
    tagline: '从可复现文献资产到可追溯科研结论',
    description:
      '以可复现文献资产为底座的科研智能体。Go TUI 通过 FastAPI / LangGraph 运行时，将检索、趋势、推荐、图谱与论断核查编排为带证据、可复核、可导出的研究流程。',
    stack: ['Python', 'Go', 'FastAPI', 'LangGraph', 'PostgreSQL', 'pgvector', 'DeepSeek'],
    highlights: [
      '本地运行时覆盖 159,187 篇论文、367,773 个片段与同量级片段向量',
      'PostgreSQL FTS + pgvector + RRF 混合检索，支持中文论断跨语言接地英文证据',
      'Go TUI 流式呈现 plan / tool / evidence / reflect / final，并支持会话导出',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/SciScope',
    accent: '#8ecfce',
    media: {
      kind: 'data',
      shots: [
        { src: '/projects/sciscope/tui-product.webp', label: 'SciScope 科研智能体终端' },
        { src: '/projects/sciscope/system-capability.webp', label: 'SciScope 系统能力地图' },
        { src: '/projects/sciscope/data-asset-funnel.webp', label: 'Data-to-Agent 数据资产规模' },
        { src: '/projects/sciscope/agent-trace.webp', label: '证据接地 Agent 执行轨迹' },
        { src: '/projects/sciscope/claim-grounding.webp', label: '论断核查与证据接地流程' },
      ],
    },
  },
]

const eduCanvasProject: Project = {
  id: 'educanvas',
  index: '01',
  name: 'EduCanvas',
  cnTitle: '教育能力驱动的通用个人 Agent 平台',
  tagline: 'One Agent Runtime across knowledge, creation and trusted learning',
  description:
    '以教育能力为核心的通用个人 Agent 平台。资料、对话、Canvas 产物与学习过程共享同一条 Agent Runtime；教育能力通过 Profile、Skills、Tools 与可信领域服务按需接入。',
  stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Drizzle', 'pnpm', 'Docker'],
  highlights: [
    'Single Agent Runtime：普通协作与教育场景共用唯一 Agent Loop',
    'gateway.v1、Model Gateway 与 Provider Adapter 构成明确协议和信任边界',
    'Web、Gateway、Worker 与领域 packages 形成可部署、可验证的 monorepo',
  ],
  year: '2026',
  github: 'https://github.com/Timcai06/EduCanvas',
  accent: '#8192d8',
  media: {
    kind: 'ui',
    shots: [
      { src: '/projects/educanvas/home.webp', label: 'EduCanvas 智能学习首页' },
      { src: '/projects/educanvas/learning-response.webp', label: 'Agent 学习内容生成' },
      { src: '/projects/educanvas/focus-mode.webp', label: '沉浸式学习提问界面' },
    ],
  },
}

export type { MediaKind, ProjectShot, Project }

export interface PortfolioProject extends Project {
  slug: string
  title: string
  summary: string
  tags: string[]
  href: string
  meta: {
    author: 'tim'
    publishState: 'published'
    publishedAt: string
  }
  repository: string
  liveUrl?: string
  status: string
  notes: string[]
}

const toPortfolioProject = (project: Project): PortfolioProject => ({
  ...project,
  slug: project.id,
  title: project.name,
  summary: project.tagline,
  tags: project.stack.slice(0, 4),
  href: `/work/${project.id}`,
  meta: {
    author: 'tim',
    publishState: 'published',
    publishedAt: `${project.year}-01-01`,
  },
  repository: project.github,
  liveUrl: project.live,
  status: project.highlights.includes('Coming soon') ? 'In the lab' : 'Shipped system',
  notes: project.highlights,
})

/** Studio keeps its current published work catalogue until its own redesign. */
export const portfolioProjects: PortfolioProject[] = landingProjects.map(toPortfolioProject)

/** Landing is a curated narrative: EduCanvas replaces Earnlytics and leads the Agent/full-stack story. */
export const landingPortfolioProjects: PortfolioProject[] = [
  eduCanvasProject,
  ...['sciscope', 'pulsegraph', 'bdi', 'formula-lab', 'a-modeling']
    .map((id) => landingProjects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project)),
]
  .map((project, index) => ({ ...project, index: String(index + 1).padStart(2, '0') }))
  .map(toPortfolioProject)
