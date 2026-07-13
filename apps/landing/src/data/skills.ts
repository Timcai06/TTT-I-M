/** 技能标签与落地页章节的交互关联。若 `to` 存在，点击可跳转到对应章节。 */
export interface SkillUse {
  /** 显示文本，如 'Earnlytics' 或 'TTT I·M Landing'。 */
  label: string
  /** 目标章节 id（如 `'projects'`）。省略时渲染为非交互的纯文本标签（未关联具体项目）。 */
  to?: string
}

/**
 * 技术栈能力行的完整数据契约。
 * 每行代表一个技能领域分类，展示在 Skills 章节的左侧分类区域。
 * @dependencies Skills 组件消费此数组；`SkillUse.to` 通过 `scrollToChapter` 触发跨章节跳转
 */
export interface SkillRow {
  /** 排序序号，'/' 前缀风格，如 `/01`。 */
  index: string
  /** 领域名称，如 'Frontend'。 */
  name: string
  /** 分类 eyebrow，双语格式，如 `'Interface · 界面实现'`。 */
  subtitle: string
  /** 一句工程化叙述 —— 描述该领域的交付哲学和关注点。 */
  description: string
  /** 具体技术/工具标签列表。 */
  tags: string[]
  /** 此技术栈在哪些项目中落地。每个 Use 可关联到 Projects 章节的具体卡片。 */
  usedIn: SkillUse[]
}

export const skillRows: SkillRow[] = [
  {
    index: '/01',
    name: 'Frontend',
    subtitle: 'Interface · 界面实现',
    description:
      '把复杂系统状态落到可维护的 React / Next.js 界面里，让模型图、运行证据和内容叙事都能被快速读懂。',
    tags: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind', 'shadcn/ui'],
    usedIn: [{ label: 'PulseGraph', to: 'projects' }, { label: 'Earnlytics', to: 'projects' }, { label: 'TTT I·M Landing' }],
  },
  {
    index: '/02',
    name: 'Motion · 3D',
    subtitle: 'Cinematic · 电影感交互',
    description:
      '用 GSAP、ScrollTrigger、R3F 和 GLSL 搭建轻量的电影感段落，让动效服务叙事，而不是抢走内容。',
    tags: ['GSAP', 'ScrollTrigger', 'Three.js', 'R3F', 'GLSL'],
    usedIn: [{ label: 'TTT I·M Landing' }],
  },
  {
    index: '/03',
    name: 'Backend',
    subtitle: 'Services · 服务与任务',
    description:
      '用 FastAPI / Django / SSE 搭起运行时、任务与数据层，让训练、检索、推理和导出成为可观察、可恢复的链路。',
    tags: ['FastAPI', 'Django', 'SSE', 'Celery', 'PostgreSQL'],
    usedIn: [{ label: 'PulseGraph', to: 'projects' }, { label: 'SciScope', to: 'projects' }, { label: 'Formula Lab', to: 'projects' }],
  },
  {
    index: '/04',
    name: 'AI · Evidence',
    subtitle: 'Models · 训练与证据',
    description:
      '从 PyTorch 训练遥测到 RAG 论断核查，把模型结果和来源证据一起交付，而不是只展示一次成功输出。',
    tags: ['PyTorch', 'DeepSeek', 'LangGraph', 'pgvector', 'YOLOv8-seg'],
    usedIn: [{ label: 'PulseGraph', to: 'projects' }, { label: 'SciScope', to: 'projects' }, { label: 'BDI · Infra Scan', to: 'projects' }],
  },
  {
    index: '/05',
    name: 'Infra',
    subtitle: 'Delivery · 部署与运维',
    description:
      '把本地优先、托管体验、数据持久化和自动化验证拆成清晰边界，让系统既能复现，也能持续交付。',
    tags: ['Docker', 'Supabase', 'GitHub Actions', 'Linux', 'Vercel'],
    usedIn: [{ label: 'PulseGraph', to: 'projects' }, { label: 'SciScope', to: 'projects' }, { label: 'Earnlytics', to: 'projects' }],
  },
  {
    index: '/06',
    name: 'Math · Modeling',
    subtitle: 'Quant · 量化建模',
    description:
      '用 Ridge、ARIMA、GARCH 和蒙特卡洛做可解释、可检验的建模，从数据到结论留下可复现的推导链路。',
    tags: ['Python', 'R', 'Ridge', 'ARIMA', 'GARCH', 'LaTeX'],
    usedIn: [{ label: '霍尔木兹封锁油价模型', to: 'projects' }],
  },
]
