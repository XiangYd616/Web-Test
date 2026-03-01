/**
 * 测试类型专属 Dashboard 首页
 *
 * 根据当前 selectedType 渲染对应测试类型的引导界面：
 * - 类型 Hero（图标/颜色/标题/描述）
 * - 检测指标卡片（具体检测内容）
 * - 工作流程步骤
 * - 快捷配置入口
 * - 配置提示 / 最佳实践
 * - 该类型的最近测试历史
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Globe,
  Info,
  Layers,
  Lightbulb,
  Play,
  Search,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type TestType, useTestConfig, useTestHistory } from '../../context/TestContext';

/* ── 类型定义 ── */

type IconComp = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

type MetricCard = {
  label: string;
  value: string;
  desc: string;
};

type StepItem = {
  num: string;
  title: string;
  desc: string;
};

type TypeConfig = {
  icon: IconComp;
  color: string;
  gradient: string;
  title: string;
  desc: string;
  longDesc: string;
  metrics: MetricCard[];
  steps: StepItem[];
  quickConfigs: { id: string; label: string; preset?: string }[];
  tips: string[];
  configHints: string[];
};

/* ── 9 种测试类型的完整配置 ── */

const TYPE_CONFIGS: Record<TestType, TypeConfig> = {
  performance: {
    icon: Zap,
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    title: '性能测试',
    desc: '测量页面加载速度、Core Web Vitals 核心指标、资源分布和渲染性能',
    longDesc:
      '基于 Lighthouse 引擎，在真实 Chromium 浏览器中加载目标页面，采集 FCP、LCP、CLS、TBT 等核心性能指标，生成资源瀑布图和优化建议。支持桌面/移动端双视口模拟。',
    metrics: [
      { label: 'LCP', value: '≤ 2.5s', desc: '最大内容绘制 — 主要内容可见时间' },
      { label: 'FID / INP', value: '≤ 100ms', desc: '首次输入延迟 / 交互到下一次绘制' },
      { label: 'CLS', value: '≤ 0.1', desc: '累积布局偏移 — 视觉稳定性' },
      { label: 'TBT', value: '≤ 200ms', desc: '总阻塞时间 — 主线程繁忙程度' },
      { label: 'FCP', value: '≤ 1.8s', desc: '首次内容绘制 — 白屏结束时间' },
      { label: 'TTI', value: '≤ 3.8s', desc: '可交互时间 — 页面完全可操作' },
    ],
    steps: [
      { num: '1', title: '输入目标 URL', desc: '在顶栏输入需要测试的页面地址' },
      { num: '2', title: '选择测试配置', desc: '快速模式 3 轮采样，完整模式 5 轮采样取中位数' },
      { num: '3', title: '运行测试', desc: '引擎在真实浏览器中加载页面并采集指标' },
      { num: '4', title: '查看报告', desc: '概览评分、瀑布图、逐项指标和优化建议' },
    ],
    quickConfigs: [
      { id: 'fast', label: '快速扫描（3 轮）', preset: 'Fast' },
      { id: 'full', label: '完整分析（5 轮）', preset: 'High' },
      { id: 'mobile', label: '移动端模拟' },
    ],
    tips: [
      '建议在网络空闲时测试，避免带宽波动影响结果',
      '首次加载和缓存加载差异较大，可对比两次结果',
      '移动端模拟使用 Moto G Power 设备配置和 4G 网络节流',
    ],
    configHints: [
      '采样轮次：快速 3 轮、完整 5 轮，轮次越多结果越稳定',
      '视口：桌面端 1350×940，移动端 412×823',
      '节流：可开启 CPU 4x 减速和网络节流模拟弱网环境',
    ],
  },
  security: {
    icon: Shield,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    title: '安全扫描',
    desc: '检测 XSS、CSRF、SQL 注入等安全漏洞，审计 SSL/TLS 和 HTTP 安全头',
    longDesc:
      '综合扫描目标站点的安全状态，覆盖 OWASP Top 10 常见漏洞、SSL/TLS 配置强度、HTTP 安全响应头完整性、Cookie 安全属性和内容安全策略（CSP）。输出漏洞列表和合规评分。',
    metrics: [
      { label: 'SSL/TLS', value: 'A+', desc: '证书强度、协议版本、密码套件评级' },
      { label: '安全头', value: '满分 10', desc: 'CSP / HSTS / X-Frame-Options 等完整性' },
      { label: 'XSS', value: '0 个', desc: '跨站脚本注入漏洞检测' },
      { label: 'SQLi', value: '0 个', desc: 'SQL 注入漏洞扫描' },
      { label: 'CSRF', value: '已防护', desc: '跨站请求伪造防护状态' },
      { label: 'Cookie', value: '安全', desc: 'Secure / HttpOnly / SameSite 属性' },
    ],
    steps: [
      { num: '1', title: '输入目标 URL', desc: '支持 HTTP 和 HTTPS 协议' },
      { num: '2', title: '选择扫描深度', desc: '快速扫描检查常见项，深度扫描覆盖 OWASP Top 10' },
      { num: '3', title: '运行扫描', desc: '引擎逐项检测安全配置和已知漏洞模式' },
      { num: '4', title: '审阅报告', desc: '漏洞列表、风险等级、合规评分和修复建议' },
    ],
    quickConfigs: [
      { id: 'quick', label: '快速扫描', preset: 'Fast' },
      { id: 'deep', label: '深度扫描（OWASP Top 10）', preset: 'High' },
      { id: 'headers', label: '仅安全头检查' },
    ],
    tips: [
      '深度扫描可能触发 WAF 规则，建议先在测试环境执行',
      '确保目标站点允许扫描，避免对生产环境造成影响',
      'HTTPS 站点建议开启 SSL/TLS 详细审计',
    ],
    configHints: [
      '扫描深度：快速模式 ~30s，深度模式 ~2min',
      '可自定义检测项：XSS / SQLi / 安全头 / SSL 等独立开关',
      '支持自定义 Cookie 和 Auth Token 扫描需要登录的页面',
    ],
  },
  seo: {
    icon: Search,
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    title: 'SEO 检查',
    desc: '审计 Meta 标签、结构化数据、Open Graph、移动端优化和内容质量',
    longDesc:
      '深入分析页面 SEO 要素，包括标题和描述长度、H1~H6 层级结构、图片 alt 属性、canonical 链接、Open Graph 和 Twitter Card、结构化数据（JSON-LD/Microdata）、robots.txt 和 sitemap.xml。',
    metrics: [
      { label: 'Meta', value: '完整', desc: 'Title、Description、Canonical 等标签' },
      { label: 'Headings', value: '规范', desc: 'H1~H6 层级结构是否合理' },
      { label: 'OG Tags', value: '齐全', desc: 'Open Graph 和 Twitter Card 元数据' },
      { label: 'Schema', value: '有效', desc: 'JSON-LD 结构化数据校验' },
      { label: '移动端', value: '友好', desc: 'Viewport、字体大小、触控目标' },
      { label: '内容', value: '优质', desc: '关键词密度、可读性、内外链分析' },
    ],
    steps: [
      { num: '1', title: '输入页面 URL', desc: '单页分析或输入首页爬取子页' },
      { num: '2', title: '选择检查范围', desc: '基础检查或完整审计（含爬虫分析）' },
      { num: '3', title: '运行分析', desc: '引擎解析 HTML 并逐项评估 SEO 要素' },
      { num: '4', title: '查看结果', desc: '逐项评分、问题列表和优化建议' },
    ],
    quickConfigs: [
      { id: 'basic', label: '基础 SEO 检查', preset: 'Fast' },
      { id: 'full', label: '完整 SEO 审计', preset: 'High' },
      { id: 'schema', label: '仅结构化数据校验' },
    ],
    tips: [
      'Title 建议 30~60 字符，Description 建议 120~160 字符',
      '每个页面应有且仅有一个 H1 标签',
      '结构化数据使用 Google 结构化数据测试工具二次验证',
    ],
    configHints: [
      '爬取深度：基础模式仅分析输入页面，完整模式爬取同域子页（最多 50 页）',
      '可自定义 User-Agent 模拟 Googlebot',
      '支持检查 robots.txt 和 sitemap.xml 是否正确',
    ],
  },
  api: {
    icon: FileText,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    title: 'API 测试',
    desc: '接口功能测试：请求构建、响应验证、状态码检查和 JSON Schema 校验',
    longDesc:
      '类似 Postman 的 API 请求测试工具。支持 GET/POST/PUT/DELETE/PATCH 等 HTTP 方法，可配置请求头、Query 参数、请求体（JSON/Form/XML），并对响应进行断言校验。支持环境变量和集合批量运行。',
    metrics: [
      { label: '方法', value: 'GET/POST/...', desc: '支持所有标准 HTTP 方法' },
      { label: '断言', value: '多类型', desc: '状态码/JSON Path/Schema/正则等' },
      { label: 'Auth', value: '多模式', desc: 'Bearer / Basic / API Key' },
      { label: '变量', value: '环境/集合', desc: '环境变量和集合变量替换' },
      { label: 'Body', value: '多格式', desc: 'JSON / Form / XML / GraphQL' },
      { label: '集合', value: '批量运行', desc: '导入 Postman 集合批量执行' },
    ],
    steps: [
      { num: '1', title: '构建请求', desc: '选择 HTTP 方法，输入 URL，配置参数和请求体' },
      { num: '2', title: '添加断言', desc: '设置响应断言：状态码、JSON Path、Schema 等' },
      { num: '3', title: '发送请求', desc: '执行请求并查看响应详情' },
      { num: '4', title: '检查结果', desc: '响应数据、断言结果、耗时和头信息' },
    ],
    quickConfigs: [
      { id: 'get', label: '新建 GET 请求' },
      { id: 'post', label: '新建 POST 请求' },
      { id: 'collection', label: '运行集合' },
    ],
    tips: [
      '使用环境变量管理 baseUrl 和 token，方便切换环境',
      '集合运行支持从 Postman 导入 .json 文件',
      '断言支持 JSON Path 表达式如 $.data.id',
    ],
    configHints: [
      '超时：默认 30s，可在高级设置中调整',
      '重试：失败时可自动重试 1~3 次',
      '支持 Pre-request Script 和 Test Script（即将推出）',
    ],
  },
  stress: {
    icon: Layers,
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    title: '压力测试',
    desc: '模拟并发用户负载，测量吞吐量、响应时间分位数和系统稳定性',
    longDesc:
      '支持负载测试（逐步增加并发）、峰值测试（瞬间峰值流量）、耐久测试（长时间稳定负载）和容量测试（寻找系统极限）四种模式。实时显示 RPS、响应时间分位数、错误率和时间线图表。',
    metrics: [
      { label: 'RPS', value: '请求/秒', desc: '系统每秒处理请求数（吞吐量）' },
      { label: 'P50', value: '中位数', desc: '50% 的请求在此时间内完成' },
      { label: 'P95', value: '尾部延迟', desc: '95% 的请求在此时间内完成' },
      { label: 'P99', value: '极端延迟', desc: '99% 的请求在此时间内完成' },
      { label: '错误率', value: '< 1%', desc: '非 2xx 响应和超时的比例' },
      { label: '成功率', value: '> 99%', desc: '成功完成的请求占比' },
    ],
    steps: [
      { num: '1', title: '配置目标', desc: '输入 API URL，配置请求方法和参数' },
      { num: '2', title: '设置负载', desc: '并发用户数、持续时间、Ramp-up 策略' },
      { num: '3', title: '选择模式', desc: '负载测试 / 峰值测试 / 耐久测试 / 容量测试' },
      { num: '4', title: '实时监控', desc: '运行中实时查看 RPS、延迟和错误率图表' },
    ],
    quickConfigs: [
      { id: 'load', label: '负载测试（10~50 并发）', preset: 'Fast' },
      { id: 'spike', label: '峰值测试（瞬间 100 并发）' },
      { id: 'endurance', label: '耐久测试（30 并发 × 5min）', preset: 'High' },
    ],
    tips: [
      '从低并发开始逐步增加，找到系统瓶颈拐点',
      '关注 P99 而非平均值，尾部延迟对用户体验影响更大',
      '建议在独立测试环境运行，避免影响生产服务',
    ],
    configHints: [
      '并发用户：建议 10~200 范围，桌面端资源有限',
      '持续时间：负载测试建议 30s~2min，耐久测试建议 5~10min',
      'Ramp-up：逐步增加并发的时间，建议设为总时长的 20%',
    ],
  },
  accessibility: {
    icon: Eye,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    title: '无障碍检测',
    desc: '依据 WCAG 2.1 标准检查页面可访问性，包含键盘导航和屏幕阅读器兼容性',
    longDesc:
      '使用 axe-core 引擎在真实浏览器中检测页面可访问性问题，覆盖 WCAG 2.1 A/AA 级标准。检查颜色对比度、键盘焦点顺序、ARIA 属性正确性、图片替代文本、表单标签等，输出逐项问题和修复建议。',
    metrics: [
      { label: '对比度', value: '≥ 4.5:1', desc: '文本与背景的颜色对比度（AA 级）' },
      { label: 'ARIA', value: '正确', desc: 'ARIA 角色、属性和状态的正确使用' },
      { label: '键盘', value: '可导航', desc: '所有交互元素可通过键盘访问' },
      { label: '表单', value: '有标签', desc: '每个表单控件关联 label 或 aria-label' },
      { label: '图片', value: '有 alt', desc: '所有信息性图片包含替代文本' },
      { label: '焦点', value: '可见', desc: '焦点指示器清晰可见' },
    ],
    steps: [
      { num: '1', title: '输入页面 URL', desc: '目标页面需要在浏览器中可正常加载' },
      { num: '2', title: '选择合规级别', desc: 'WCAG A 级（基础）或 AA 级（推荐）' },
      { num: '3', title: '运行检测', desc: 'axe-core 在页面 DOM 上执行 80+ 条规则' },
      { num: '4', title: '修复问题', desc: '按严重性排序查看问题，附带 CSS 选择器定位' },
    ],
    quickConfigs: [
      { id: 'wcag-a', label: 'WCAG 2.1 A 级', preset: 'Fast' },
      { id: 'wcag-aa', label: 'WCAG 2.1 AA 级', preset: 'High' },
      { id: 'best', label: '最佳实践（含 AAA 建议）' },
    ],
    tips: [
      '先修复 Critical 和 Serious 级别问题，再处理 Moderate',
      '颜色对比度不足是最常见的可访问性问题',
      '建议结合手动键盘导航测试，自动化工具无法覆盖所有场景',
    ],
    configHints: [
      '合规级别：A 级检查 ~30 条规则，AA 级检查 ~50 条规则',
      '可排除特定 CSS 选择器的元素（如第三方小部件）',
      '支持检查 iframe 内部内容（需同源）',
    ],
  },
  compatibility: {
    icon: Smartphone,
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    title: '兼容性测试',
    desc: '跨浏览器和设备兼容性检测，支持特性检测、截图对比和响应式验证',
    longDesc:
      '在多个视口和浏览器配置下加载目标页面，检查 CSS 特性兼容性、JavaScript API 可用性、响应式断点行为和截图像素差异。输出各设备下的渲染结果和兼容性评分。',
    metrics: [
      { label: '桌面', value: '1920/1366/1024', desc: '三种常见桌面分辨率下的渲染' },
      { label: '平板', value: '768×1024', desc: 'iPad 竖屏视口下的布局' },
      { label: '手机', value: '375/412', desc: 'iPhone SE 和中端 Android 设备' },
      { label: 'CSS', value: '特性检查', desc: 'Flexbox/Grid/Custom Properties 等支持度' },
      { label: 'JS API', value: '兼容性', desc: 'IntersectionObserver/ResizeObserver 等' },
      { label: '截图', value: '像素对比', desc: '不同视口间的视觉差异检测' },
    ],
    steps: [
      { num: '1', title: '输入目标 URL', desc: '输入需要测试兼容性的页面地址' },
      { num: '2', title: '选择设备组', desc: '桌面浏览器组 / 移动端设备组 / 全部' },
      { num: '3', title: '运行检测', desc: '引擎在各视口配置下加载页面并截图' },
      { num: '4', title: '对比结果', desc: '查看各设备的渲染截图和差异高亮' },
    ],
    quickConfigs: [
      { id: 'desktop', label: '桌面浏览器（3 种分辨率）', preset: 'Fast' },
      { id: 'mobile', label: '移动端设备（4 种）', preset: 'High' },
      { id: 'all', label: '全设备覆盖' },
    ],
    tips: [
      '优先测试用户量最大的设备分辨率',
      '响应式断点建议测试：640px、768px、1024px、1280px',
      '截图对比的像素差异阈值建议设为 5% 以内',
    ],
    configHints: [
      '视口：可自定义分辨率列表',
      '截图等待：页面加载后等待 2s 再截图，避免动画干扰',
      '支持自定义 User-Agent 模拟不同浏览器',
    ],
  },
  ux: {
    icon: Activity,
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    title: '用户体验',
    desc: '真实浏览器采集用户体验指标，包含交互延迟、滚动流畅度和视觉稳定性',
    longDesc:
      '在真实浏览器环境中模拟用户操作（滚动、点击、输入），采集 INP（交互延迟）、滚动帧率、长任务阻塞、视觉稳定性等体验指标。量化用户感知的页面流畅度，输出体验评分和优化建议。',
    metrics: [
      { label: 'INP', value: '≤ 200ms', desc: '交互到下一次绘制 — 响应灵敏度' },
      { label: '帧率', value: '≥ 55fps', desc: '滚动时的渲染帧率' },
      { label: '长任务', value: '< 50ms', desc: '阻塞主线程的长任务数量和时长' },
      { label: 'CLS', value: '≤ 0.1', desc: '交互过程中的布局偏移' },
      { label: '首屏', value: '≤ 1.5s', desc: '可见内容首次完整渲染' },
      { label: '体验分', value: '0~100', desc: '综合体验评分' },
    ],
    steps: [
      { num: '1', title: '输入页面 URL', desc: '目标页面需有可交互内容' },
      { num: '2', title: '选择检测模式', desc: '快速检测或深度分析（含模拟操作）' },
      { num: '3', title: '运行采集', desc: '浏览器加载页面并模拟用户滚动和交互' },
      { num: '4', title: '查看报告', desc: '帧率时间线、长任务分析和体验评分' },
    ],
    quickConfigs: [
      { id: 'quick', label: '快速检测（仅加载指标）', preset: 'Fast' },
      { id: 'full', label: '深度分析（含滚动和交互）', preset: 'High' },
      { id: 'scroll', label: '仅滚动性能' },
    ],
    tips: [
      'INP 是 Google 2024 年起取代 FID 的核心 Web Vital',
      '滚动性能问题通常由固定定位元素或大量重绘引起',
      '使用 Chrome DevTools Performance 面板辅助定位长任务',
    ],
    configHints: [
      '模拟操作：深度模式自动滚动页面 3 屏并点击可交互元素',
      '采样时长：快速模式 10s，深度模式 30s',
      '可自定义滚动速度和交互目标选择器',
    ],
  },
  website: {
    icon: Globe,
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    title: '综合网站测试',
    desc: '一站式全方位评估：性能 + 安全 + SEO + 无障碍，输出综合诊断报告',
    longDesc:
      '集成性能、安全、SEO 和无障碍四大引擎，对目标站点进行全方位扫描。每个维度独立评分，最终输出综合健康度分数和优先修复建议。适合快速了解网站整体质量状态。',
    metrics: [
      { label: '性能', value: '0~100', desc: 'Lighthouse 性能评分' },
      { label: '安全', value: '0~100', desc: 'SSL + 安全头 + 漏洞综合评分' },
      { label: 'SEO', value: '0~100', desc: 'Meta + 结构化数据 + 内容评分' },
      { label: '无障碍', value: '0~100', desc: 'WCAG 合规评分' },
      { label: '综合', value: '加权平均', desc: '四维度加权综合分数' },
      { label: '建议', value: '优先级排序', desc: '按影响度排序的修复建议' },
    ],
    steps: [
      { num: '1', title: '输入网站 URL', desc: '输入网站首页或任意页面地址' },
      { num: '2', title: '选择扫描模式', desc: '快速扫描 ~1min，全面检测 ~3min' },
      { num: '3', title: '等待分析', desc: '四大引擎并行扫描，实时展示进度' },
      { num: '4', title: '综合报告', desc: '四维雷达图、逐项评分和优先修复清单' },
    ],
    quickConfigs: [
      { id: 'fast', label: '快速扫描（核心指标）', preset: 'Fast' },
      { id: 'full', label: '全面检测（四维深度）', preset: 'High' },
      { id: 'compare', label: '与上次对比' },
    ],
    tips: [
      '综合测试适合定期运行，监控网站质量趋势',
      '首次运行后建议关注评分最低的维度优先优化',
      '可将报告导出 PDF 分享给团队成员',
    ],
    configHints: [
      '快速模式跳过深度漏洞扫描和爬虫分析',
      '全面模式启用所有引擎的完整配置',
      '支持定时任务：每日/每周自动运行并对比',
    ],
  },
};

/** 聚焦顶栏 URL 输入框 */
const focusTopbarUrl = () => {
  const input = document.querySelector<HTMLInputElement>('.tw-topbar-url-input');
  if (input) {
    input.focus();
    input.select();
  }
};

type Props = {
  testType: TestType;
};

const TypedDashboardHome = ({ testType }: Props) => {
  const { t } = useTranslation();
  const { url, applyPreset } = useTestConfig();
  const { history } = useTestHistory();
  const cfg = TYPE_CONFIGS[testType];
  const Icon = cfg.icon;

  const recentTyped = useMemo(
    () => history.filter(h => h.type === testType).slice(0, 5),
    [history, testType]
  );

  const handleQuickStart = useCallback(
    (preset?: string) => {
      if (preset) applyPreset(preset as 'Fast' | 'High' | 'Custom');
      if (!url?.trim()) {
        focusTopbarUrl();
        return;
      }
      window.dispatchEvent(new CustomEvent('tw:focus-url-and-run'));
    },
    [url, applyPreset]
  );

  const handleRunUrl = useCallback(() => {
    if (!url?.trim()) {
      focusTopbarUrl();
      return;
    }
    window.dispatchEvent(new CustomEvent('tw:focus-url-and-run'));
  }, [url]);

  return (
    <div className='tw-typed-home'>
      {/* ── Hero ── */}
      <div className='tw-typed-hero'>
        <div className='tw-typed-hero-icon' style={{ background: cfg.gradient }}>
          <Icon className='w-8 h-8' style={{ color: '#fff' }} />
        </div>
        <div className='tw-typed-hero-text'>
          <h1 className='tw-typed-hero-title'>{cfg.title}</h1>
          <p className='tw-typed-hero-desc'>{cfg.desc}</p>
        </div>
      </div>

      {/* ── 详细描述 ── */}
      <div className='tw-typed-longdesc'>
        <BookOpen className='w-4 h-4' style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
        <p>{cfg.longDesc}</p>
      </div>

      {/* ── 检测指标卡片 ── */}
      <div className='tw-typed-section-title'>
        <BarChart3 className='w-3.5 h-3.5' style={{ color: cfg.color }} />
        <span>检测指标</span>
      </div>
      <div className='tw-typed-metrics'>
        {cfg.metrics.map((m, i) => (
          <div key={i} className='tw-typed-metric-card'>
            <div className='tw-typed-metric-label'>{m.label}</div>
            <div className='tw-typed-metric-value' style={{ color: cfg.color }}>
              {m.value}
            </div>
            <div className='tw-typed-metric-desc'>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* ── 工作流程 ── */}
      <div className='tw-typed-section-title'>
        <CheckCircle2 className='w-3.5 h-3.5' style={{ color: cfg.color }} />
        <span>工作流程</span>
      </div>
      <div className='tw-typed-steps'>
        {cfg.steps.map((s, i) => (
          <div key={i} className='tw-typed-step'>
            <div className='tw-typed-step-num' style={{ background: cfg.gradient }}>
              {s.num}
            </div>
            <div className='tw-typed-step-body'>
              <div className='tw-typed-step-title'>{s.title}</div>
              <div className='tw-typed-step-desc'>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA + 快捷配置 ── */}
      <div className='tw-typed-actions'>
        <button
          type='button'
          className='tw-typed-cta'
          style={{ background: cfg.gradient }}
          onClick={handleRunUrl}
        >
          {url?.trim() ? (
            <>
              <Play className='w-4 h-4' />
              <span>{t('typed.startTest', '开始测试')}</span>
            </>
          ) : (
            <>
              <Search className='w-4 h-4' />
              <span>{t('typed.enterUrl', '输入 URL 开始')}</span>
            </>
          )}
        </button>
        <div className='tw-typed-quick-configs'>
          {cfg.quickConfigs.map(qc => (
            <button
              key={qc.id}
              type='button'
              className='tw-typed-quick-btn'
              onClick={() => handleQuickStart(qc.preset)}
            >
              <span>{qc.label}</span>
              <ArrowRight className='w-3 h-3 opacity-40' />
            </button>
          ))}
        </div>
      </div>

      {/* ── 两列：配置提示 + 最佳实践 ── */}
      <div className='tw-typed-info-grid'>
        <div className='tw-typed-info-card'>
          <div className='tw-typed-info-card-title'>
            <Info className='w-3.5 h-3.5' style={{ color: cfg.color }} />
            <span>配置说明</span>
          </div>
          <ul className='tw-typed-info-list'>
            {cfg.configHints.map((hint, i) => (
              <li key={i}>
                <AlertTriangle
                  className='w-3 h-3'
                  style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }}
                />
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className='tw-typed-info-card'>
          <div className='tw-typed-info-card-title'>
            <Lightbulb className='w-3.5 h-3.5' style={{ color: cfg.color }} />
            <span>最佳实践</span>
          </div>
          <ul className='tw-typed-info-list'>
            {cfg.tips.map((tip, i) => (
              <li key={i}>
                <CheckCircle2
                  className='w-3 h-3'
                  style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }}
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 最近该类型历史 ── */}
      {recentTyped.length > 0 && (
        <div className='tw-typed-recent'>
          <h3 className='tw-typed-recent-title'>
            <Clock className='w-3.5 h-3.5' />
            <span>{t('typed.recentTests', '最近测试')}</span>
          </h3>
          <div className='tw-typed-recent-list'>
            {recentTyped.map(item => (
              <div key={item.id} className='tw-typed-recent-item'>
                <span className='tw-typed-recent-url'>{item.url}</span>
                <span
                  className='tw-typed-recent-score'
                  style={{
                    color:
                      (item.score ?? 0) >= 90
                        ? '#22c55e'
                        : (item.score ?? 0) >= 60
                          ? '#eab308'
                          : '#ef4444',
                  }}
                >
                  {item.score ?? '—'}
                </span>
                {item.createdAt && (
                  <span className='tw-typed-recent-time'>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TypedDashboardHome;
