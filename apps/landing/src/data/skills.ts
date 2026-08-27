/**
 * 简历中的技术栈分类。Landing 保持同一份类别与条目，不再额外推导能力宣言。
 * @dependencies Skills 组件消费此数组
 */
export interface SkillRow {
  /** 排序序号，'/' 前缀风格，如 `/01`。 */
  index: string
  /** 简历中的中文分类名。 */
  name: string
  /** 英文辅助标签。 */
  subtitle: string
  /** 简历中的具体技术/工具。 */
  tags: string[]
}

export const skillRows: SkillRow[] = [
  {
    index: '/01',
    name: '编程语言',
    subtitle: 'Programming languages',
    tags: ['Python', 'TypeScript', 'Go', 'SQL', 'C++'],
  },
  {
    index: '/02',
    name: '工程与基础工具',
    subtitle: 'Engineering & tooling',
    tags: ['Git / GitHub', 'Docker', 'Linux', 'Makefile', 'GitHub Actions', 'CI/CD', 'Playwright', 'npm / pnpm', 'Conda', 'Homebrew'],
  },
  {
    index: '/03',
    name: '前端与客户端',
    subtitle: 'Frontend & clients',
    tags: ['React', 'Vue', 'Next.js', 'Vite', 'Go TUI'],
  },
  {
    index: '/04',
    name: '后端与服务',
    subtitle: 'Backend & services',
    tags: ['FastAPI', 'Django', 'Redis', 'Celery'],
  },
  {
    index: '/05',
    name: 'UI/UX 与视觉实现',
    subtitle: 'Interface & visual implementation',
    tags: ['Motion', 'Typography', 'GSAP', 'Three.js', 'Lenis', 'CSS Animation'],
  },
  {
    index: '/06',
    name: '数据与 AI',
    subtitle: 'Data & AI',
    tags: ['PostgreSQL', 'pgvector', 'Supabase', 'PyTorch', 'YOLO', 'PaddleOCR', 'RAG'],
  },
]
