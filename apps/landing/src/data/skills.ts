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
      '把设计稿、动效节奏和内容结构落到可维护的 React / Next.js 界面里，关注首屏、响应式和真实交互手感。',
    tags: ['React 19', 'Next.js 16', 'TypeScript', 'Tailwind', 'shadcn/ui'],
    usedIn: [{ label: 'Earnlytics', to: 'projects' }, { label: 'TTT I·M Landing' }],
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
      '用 FastAPI / Django 搭起接口、任务队列和数据层，把上传、推理、导出这类长流程做成可复现、可部署的链路。',
    tags: ['FastAPI', 'Django', 'Celery', 'Redis', 'PostgreSQL'],
    usedIn: [{ label: 'Earnlytics', to: 'projects' }, { label: 'Formula Lab', to: 'projects' }],
  },
  {
    index: '/04',
    name: 'AI · Data',
    subtitle: 'Models · 模型接入',
    description:
      '从 YOLOv8-seg、OCR 到 RAG，把模型能力接进真实产品流程：上传、识别、检索、对话、导出。',
    tags: ['DeepSeek', 'Cohere', 'YOLOv8-seg', 'PaddleOCR', 'pgvector'],
    usedIn: [{ label: 'BDI · Infra Scan', to: 'projects' }, { label: 'Earnlytics', to: 'projects' }],
  },
  {
    index: '/05',
    name: 'Infra',
    subtitle: 'Delivery · 部署与运维',
    description:
      '把部署、缓存、任务调度和自动化同步做成稳定链路，让原型能持续运行，而不是只跑在本地。',
    tags: ['Docker', 'Vercel', 'Supabase', 'GitHub Actions', 'Linux'],
    usedIn: [{ label: 'Earnlytics', to: 'projects' }, { label: 'Formula Lab', to: 'projects' }],
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
