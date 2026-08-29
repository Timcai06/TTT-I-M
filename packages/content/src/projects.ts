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
  /** 图片描述标签，用作 caption。 */
  label: string
  /** 对截图内容的可访问描述，不复用装饰性 caption。 */
  alt: string
  /** 原始资源宽度，供 Lightbox 在加载前建立稳定布局。 */
  width: number
  /** 原始资源高度，供 Lightbox 在加载前建立稳定布局。 */
  height: number
}

/** 带来源说明的项目量化证据；没有可核验 evidence 的数字不得进入展示层。 */
interface ProjectMetric {
  label: string
  value: number
  prefix?: string
  suffix?: string
  precision?: number
  evidence: string
}

/** 项目长案例中的一个内容段落；Landing 可以按需在详情 Dialog 中渲染。 */
interface ProjectDetailSection {
  id: string
  title: string
  body: string
  bullets?: string[]
}

/** 一个聚合项目中的独立案例；首页只挂载当前案例的主图。 */
interface ProjectCaseStudy {
  /** 案例内稳定标识，用于交互状态与测试定位。 */
  id: string
  /** 案例顺序，显示为 `01` / `02` 等。 */
  index: string
  /** 案例名称。 */
  title: string
  /** 对题目或决策对象的短说明。 */
  subtitle: string
  /** 该案例解决了什么问题，以及证据边界是什么。 */
  summary: string
  /** 案例最有辨识度的方法标签。 */
  methods: string[]
  /** 案例自己的 GitHub 仓库。 */
  repository: string
  /** 切换到该案例时按需加载的代表性结果图。 */
  shot: ProjectShot
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
  /** 只收录现有材料中可核验的量化证据。 */
  metrics?: ProjectMetric[]
  /** 可选长案例正文；缺失时由现有 description/highlights 组成详情。 */
  detail?: {
    lede?: string
    sections?: ProjectDetailSection[]
  }
  /** 多个相关工作共享一个项目入口时使用的案例索引。 */
  caseStudies?: ProjectCaseStudy[]
}

const projectShot = (
  src: string,
  label: string,
  alt: string,
  width: number,
  height: number,
): ProjectShot => ({ src, label, alt, width, height })

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
        projectShot('/projects/bdi/corrosion.webp', '钢筋锈蚀', '桥梁钢筋锈蚀病害识别结果', 1100, 1100),
        projectShot('/projects/bdi/seepage.webp', '渗水监测', '桥梁渗水病害识别结果', 1100, 1100),
        projectShot('/projects/bdi/spalling.webp', '混凝土剥落', '桥梁混凝土剥落病害识别结果', 1100, 1100),
      ],
    },
    metrics: [
      {
        label: '病害类别',
        value: 6,
        suffix: ' 类',
        evidence: '现有系统支持裂缝、破损、梳齿、孔洞、钢筋外露与渗水六类病害分割。',
      },
    ],
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
        projectShot('/projects/pulsegraph/live-monitor.webp', '训练监控 · 推理与运行事件', 'PulseGraph 训练监控、推理与运行事件界面', 1600, 1000),
        projectShot('/projects/pulsegraph/training-controls.webp', '训练资源与模型图控制台', 'PulseGraph 训练资源与模型图控制台', 1600, 1000),
        projectShot('/projects/pulsegraph/training-telemetry.webp', '实时训练遥测', 'PulseGraph 实时训练遥测图表', 1600, 1000),
        projectShot('/projects/pulsegraph/inference-output.webp', '真实数据集推理输出', 'PulseGraph 真实数据集推理输出界面', 1600, 1000),
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
        projectShot('/projects/earnlytics/landing.webp', 'AI 驱动的财报分析', 'Earnlytics 财报分析首页', 1600, 876),
      ],
    },
    metrics: [
      {
        label: '覆盖公司',
        value: 30,
        suffix: ' 家',
        evidence: '现有项目介绍记录平台覆盖 30 家美股科技公司。',
      },
      {
        label: '财报资产',
        value: 109,
        suffix: ' 份',
        evidence: '现有项目介绍记录已完成 109 份财报的自动化扩展。',
      },
    ],
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
        projectShot('/projects/formula-lab/console.webp', 'LaTeX 控制台', 'Formula Lab LaTeX 公式识别控制台', 1600, 868),
        projectShot('/projects/formula-lab/timeline.webp', '识别任务时间线', 'Formula Lab 异步识别任务时间线', 1600, 871),
        projectShot('/projects/formula-lab/workbench.webp', '论文工作区', 'Formula Lab 论文审校与导出工作区', 1600, 875),
      ],
    },
  },
  {
    id: 'modeling-lab',
    index: '05',
    name: 'Modeling Lab',
    cnTitle: '应用数学建模研究集',
    tagline: 'Four studies in uncertainty, optimization and evidence',
    description:
      '把四次建模工作放进同一个研究入口：从能源冲击、沙漠决策、文物成分识别到农业风险规划。每个案例保留自己的问题、模型、检验图表与可复现仓库，而不是被拆成四张相似的项目卡。',
    stack: ['Python', 'R', 'LaTeX', 'MILP', 'MDP', 'Monte Carlo', 'CLR', 'CVaR'],
    highlights: [
      '04 studies · 机制建模、序贯决策、成分数据分析与风险优化',
      '案例之间共享可复现骨架，但不抹平各自的数据口径与假设边界',
      '首页只加载当前案例主图，其余结果按需展开并直达独立仓库',
    ],
    year: '2026',
    github: 'https://github.com/Timcai06/26_MathModel_Tunnel',
    accent: '#98b8b5',
    media: {
      kind: 'data',
      shots: [
        projectShot('/projects/modeling-lab/tunnel.webp', '能源冲击 · 蒙特卡洛情景树', '霍尔木兹封锁与油价冲击的蒙特卡洛情景结果', 1600, 850),
      ],
    },
    metrics: [
      {
        label: '研究案例',
        value: 4,
        suffix: ' 项',
        evidence: 'Modeling Lab 由能源冲击、沙漠决策、文物成分识别与农业风险规划四个独立案例组成。',
      },
    ],
    caseStudies: [
      {
        id: 'tunnel',
        index: '01',
        title: '霍尔木兹封锁与油价冲击',
        subtitle: '机制模型 · Markov · Monte Carlo',
        summary: '解释短期价格平台，并用状态转移与尾部情景刻画 60—180 天的调节路径。',
        methods: ['Mechanism', 'Markov', 'Monte Carlo'],
        repository: 'https://github.com/Timcai06/26_MathModel_Tunnel',
        shot: projectShot('/projects/modeling-lab/tunnel.webp', '第 180 天价格分布与尾部突破概率', '霍尔木兹案例第 180 天价格分布与尾部概率图', 1600, 850),
      },
      {
        id: 'desert',
        index: '02',
        title: '穿越沙漠的序贯决策',
        subtitle: 'MILP · MDP · 多人博弈',
        summary: '把天气、负重、补给和多人策略放进统一决策过程，并审计候选策略的收益—失败风险前沿。',
        methods: ['MILP', 'MDP', 'Game Theory'],
        repository: 'https://github.com/Timcai06/26_MathModel_Desert',
        shot: projectShot('/projects/modeling-lab/desert.webp', '收益—失败风险前沿', '穿越沙漠策略的收益与失败风险前沿图', 1800, 735),
      },
      {
        id: 'glass',
        index: '03',
        title: '古代玻璃成分与鉴别',
        subtitle: 'Compositional Data · CLR · Robust Clustering',
        summary: '在成分闭合约束下分析风化差异、类型分离与未知样本归类，避免直接对比例数据做失真的欧氏比较。',
        methods: ['CLR', 'Robust Clustering', 'Classification'],
        repository: 'https://github.com/Timcai06/26_MathModel_Glass',
        shot: projectShot('/projects/modeling-lab/glass.webp', '铅钡与高钾玻璃的成分分离', '古代玻璃案例中铅钡与高钾玻璃的成分分离图', 1224, 900),
      },
      {
        id: 'agriculture',
        index: '04',
        title: '农作物种植策略优化',
        subtitle: 'MILP · SAA · CVaR',
        summary: '在地块、轮作和销量约束下，从确定性排产扩展到可审计的样本外风险规划。',
        methods: ['MILP', 'SAA', 'CVaR'],
        repository: 'https://github.com/Timcai06/26_MathModel_Agriculture',
        shot: projectShot('/projects/modeling-lab/agriculture.webp', '统一决策骨架与三层证据链', '农业种植策略的统一决策骨架与三层证据链', 1800, 717),
      },
    ],
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
        projectShot('/projects/sciscope/tui-product.webp', 'SciScope 科研智能体终端', 'SciScope 科研智能体的 Go TUI 产品界面', 1600, 1000),
        projectShot('/projects/sciscope/system-capability.webp', 'SciScope 系统能力地图', 'SciScope 检索、趋势、推荐与论断核查能力地图', 1600, 1000),
        projectShot('/projects/sciscope/data-asset-funnel.webp', 'Data-to-Agent 数据资产规模', 'SciScope 从论文到向量资产的数据漏斗', 1600, 1000),
        projectShot('/projects/sciscope/agent-trace.webp', '证据接地 Agent 执行轨迹', 'SciScope Agent 的计划、工具、证据与反思执行轨迹', 1600, 1000),
        projectShot('/projects/sciscope/claim-grounding.webp', '论断核查与证据接地流程', 'SciScope 中文论断跨语言接地英文证据的流程', 1600, 1000),
      ],
    },
    metrics: [
      {
        label: '论文资产',
        value: 159187,
        suffix: ' 篇',
        evidence: '现有项目介绍记录本地运行时覆盖 159,187 篇论文。',
      },
      {
        label: '检索片段',
        value: 367773,
        suffix: ' 个',
        evidence: '现有项目介绍记录本地运行时包含 367,773 个论文片段。',
      },
    ],
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
      projectShot('/projects/educanvas/home.webp', 'EduCanvas 智能学习首页', 'EduCanvas 智能学习首页与 Agent 输入区', 1920, 1045),
      projectShot('/projects/educanvas/learning-response.webp', 'Agent 学习内容生成', 'EduCanvas Agent 生成结构化学习内容的界面', 1920, 1046),
      projectShot('/projects/educanvas/focus-mode.webp', '沉浸式学习提问界面', 'EduCanvas 沉浸式学习提问与回答界面', 1920, 1047),
    ],
  },
}

export type {
  MediaKind,
  Project,
  ProjectCaseStudy,
  ProjectDetailSection,
  ProjectMetric,
  ProjectShot,
}

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
  ...['sciscope', 'pulsegraph', 'bdi', 'formula-lab', 'modeling-lab']
    .map((id) => landingProjects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project)),
]
  .map((project, index) => ({ ...project, index: String(index + 1).padStart(2, '0') }))
  .map(toPortfolioProject)
