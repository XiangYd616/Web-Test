import {
  Activity,
  BarChart3,
  ClipboardList,
  Cloud,
  Code2,
  FileCode2,
  FolderOpen,
  Globe,
  Laptop,
  Monitor,
  Play,
  Rocket,
  Shield,
  Sparkles,
  Timer,
  Variable,
  Zap,
} from 'lucide-react';

export const FEATURES = [
  {
    icon: Zap,
    title: '多引擎测试',
    desc: '性能、安全、SEO、无障碍、压力、兼容性、UX — 一站式覆盖所有质量维度',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: ClipboardList,
    title: '测试计划编排',
    desc: '可视化编排多步骤测试计划，支持串行/并行执行、失败策略、定时调度',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: FolderOpen,
    title: 'API 集合管理',
    desc: '类 Postman 的请求集合，支持文件夹分组、环境变量注入、断言与变量提取',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Variable,
    title: '环境变量联动',
    desc: '多环境配置一键切换，模板变量自动解析，测试配置与环境无缝衔接',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: BarChart3,
    title: '可视化报告',
    desc: '丰富的图表与评分体系，历史趋势对比，一键导出 PDF / JSON / CSV',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Activity,
    title: '实时监控',
    desc: '站点可用性监控、错误追踪、自动告警，7×24 守护线上质量',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Cloud,
    title: '云端同步',
    desc: '本地桌面数据自动同步到云端，多设备共享，团队协作无障碍',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    icon: Code2,
    title: 'CI/CD 集成',
    desc: '提供 CLI 和 REST API，轻松集成 GitHub Actions、GitLab CI、Jenkins',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
];

export const STATS = [
  { value: '8+', label: '测试引擎' },
  { value: '100%', label: '开源免费' },
  { value: '<1s', label: '启动速度' },
  { value: '∞', label: '测试次数' },
];

export const TECH_STACK = [
  { name: 'React', desc: '前端框架' },
  { name: 'TypeScript', desc: '类型安全' },
  { name: 'Node.js', desc: '后端运行时' },
  { name: 'Electron', desc: '桌面应用' },
  { name: 'SQLite', desc: '本地存储' },
  { name: 'PostgreSQL', desc: '云端数据库' },
  { name: 'Tailwind CSS', desc: 'UI 样式' },
  { name: 'Playwright', desc: '浏览器引擎' },
];

export const WORKFLOW_STEPS = [
  { icon: FileCode2, title: '创建模板', desc: '选择测试类型，配置参数' },
  { icon: Play, title: '执行测试', desc: '一键运行，实时查看进度' },
  { icon: BarChart3, title: '分析报告', desc: '可视化结果，定位问题' },
  { icon: Rocket, title: '持续优化', desc: '历史对比，迭代改进' },
];

export const ADVANTAGES = [
  { icon: Shield, title: '安全可靠', desc: '数据本地优先，支持私有化部署' },
  { icon: Timer, title: '极速体验', desc: 'Vite + React 极速加载，毫秒级响应' },
  { icon: Monitor, title: '跨平台', desc: '桌面端执行测试，Web 端管理数据，云端同步无缝协作' },
  { icon: Sparkles, title: '开箱即用', desc: '预置官方模板，零配置开始测试' },
];

export const FAQ_ITEMS = [
  {
    q: 'Test-Web 完全免费吗？',
    a: '是的，Test-Web 是 100% 开源免费的项目。所有功能均可免费使用，无隐藏收费、无功能限制、无测试次数上限。',
  },
  {
    q: '我的测试数据安全吗？',
    a: '桌面端数据完全存储在本地 SQLite 数据库中，不会上传到任何第三方服务器。云端同步功能可选开启，数据传输全程加密。',
  },
  {
    q: '支持哪些测试类型？',
    a: '支持性能测试、安全扫描、SEO 检测、无障碍审计（WCAG）、压力测试、API 自动化测试、兼容性测试、UX 体验测试共 8 大引擎。',
  },
  {
    q: '桌面端和 Web 端有什么区别？',
    a: '桌面端内置浏览器引擎，支持所有测试类型的本地执行、离线使用和本地数据库。Web 端专注云端数据同步与管理，包括历史记录查看、集合管理、环境配置、站点监控等（测试执行功能仅限桌面端）。两者数据通过云端自动同步。',
  },
  {
    q: '如何集成到 CI/CD 流程？',
    a: '提供完整的 REST API 和 CI/CD 面板，支持 GitHub Actions、GitLab CI、Jenkins 等主流平台。可在设置页的 CI/CD 标签中生成 Token 和配置片段。',
  },
  {
    q: '支持团队协作吗？',
    a: '支持。通过工作空间功能，团队成员可以共享测试模板、环境配置、API 集合和测试计划。管理员可管理成员角色和权限。',
  },
];

export const COMPARISON_DATA = {
  headers: ['功能', 'Test-Web', 'Lighthouse', 'Postman', 'JMeter'],
  rows: [
    { feature: '性能测试', values: [true, true, false, false] },
    { feature: '安全扫描', values: [true, false, false, false] },
    { feature: 'SEO 检测', values: [true, true, false, false] },
    { feature: '无障碍审计', values: [true, true, false, false] },
    { feature: 'API 测试', values: [true, false, true, false] },
    { feature: '压力测试', values: [true, false, false, true] },
    { feature: 'UX 体验测试', values: [true, false, false, false] },
    { feature: '测试计划编排', values: [true, false, true, true] },
    { feature: '环境变量管理', values: [true, false, true, false] },
    { feature: 'CI/CD 集成', values: [true, true, true, true] },
    { feature: '桌面端离线使用', values: [true, false, true, false] },
    { feature: '开源免费', values: [true, true, false, false] },
  ],
};

export const DOWNLOAD_PLATFORMS = [
  { name: 'Windows', desc: 'Windows 10+', icon: Monitor, file: '.exe' },
  { name: 'macOS', desc: 'macOS 12+', icon: Laptop, file: '.dmg' },
  { name: 'Linux', desc: 'Ubuntu / Debian', icon: Globe, file: '.AppImage' },
];
