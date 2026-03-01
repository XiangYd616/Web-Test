import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Download,
  Github,
  Globe,
  HelpCircle,
  Lock,
  Minus,
  Play,
  Rocket,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { APP_URL, GITHUB_URL } from '@/config';
import {
  ADVANTAGES,
  COMPARISON_DATA,
  DOWNLOAD_PLATFORMS,
  FAQ_ITEMS,
  FEATURES,
  STATS,
  TECH_STACK,
  WORKFLOW_STEPS,
} from '@/data/constants';

// ─── 子组件 ───

const GradientText = ({ children }: { children: React.ReactNode }) => (
  <span className='bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 dark:from-blue-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent'>
    {children}
  </span>
);

type SlideDirection = 'up' | 'left' | 'right' | 'none';

const SLIDE_OFFSETS: Record<SlideDirection, string> = {
  up: 'translateY(32px)',
  left: 'translateX(-40px)',
  right: 'translateX(40px)',
  none: 'none',
};

const AnimatedEntry = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: SlideDirection;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0)' : SLIDE_OFFSETS[direction],
      }}
    >
      {children}
    </div>
  );
};

// ─── 主组件 ───

const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const goApp = useCallback((path: string) => {
    window.open(`${APP_URL}${path}`, '_blank');
  }, []);

  return (
    <div className='min-h-screen bg-background text-foreground overflow-x-hidden'>
      {/* ── 导航栏 ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 40 ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className='max-w-7xl mx-auto px-6 h-16 flex items-center justify-between'>
          <button
            type='button'
            className='flex items-center gap-2.5 cursor-pointer'
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Globe className='h-7 w-7 text-primary' />
            <span className='text-xl font-bold tracking-tight'>Test-Web</span>
          </button>
          <nav className='hidden md:flex items-center gap-6 text-sm'>
            <a
              href='#features'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              功能
            </a>
            <a
              href='#compare'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              对比
            </a>
            <a
              href='#download'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              下载
            </a>
            <a
              href='#faq'
              className='text-muted-foreground hover:text-foreground transition-colors'
            >
              FAQ
            </a>
          </nav>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='sm'
              className='cursor-pointer'
              onClick={() => window.open(GITHUB_URL, '_blank')}
            >
              <Github className='h-4 w-4 mr-1' />
              GitHub
            </Button>
            <Button size='sm' className='cursor-pointer' onClick={() => goApp('/history')}>
              进入控制台 <ArrowRight className='h-3.5 w-3.5 ml-1' />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className='relative pt-32 pb-24 md:pt-48 md:pb-36 overflow-hidden'>
        {/* 多层背景：网格 + 光晕 + 浮动装饰 */}
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]' />
          <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-br from-blue-600/10 via-violet-600/8 to-transparent rounded-full blur-[140px] animate-pulse-glow' />
          <div className='absolute top-20 right-[10%] w-[500px] h-[500px] bg-purple-500/6 rounded-full blur-[120px]' />
          <div className='absolute bottom-10 left-[5%] w-[400px] h-[400px] bg-cyan-500/6 rounded-full blur-[100px]' />
          <div className='absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent' />
          {/* 浮动几何装饰 */}
          <div className='absolute top-[18%] left-[8%] w-16 h-16 rounded-2xl border border-primary/10 bg-primary/3 animate-float-slow' />
          <div
            className='absolute top-[30%] right-[12%] w-10 h-10 rounded-full border border-violet-500/15 bg-violet-500/5 animate-float-medium'
            style={{ animationDelay: '1s' }}
          />
          <div
            className='absolute bottom-[25%] left-[15%] w-8 h-8 rounded-lg border border-cyan-500/15 bg-cyan-500/5 animate-float-medium'
            style={{ animationDelay: '2s' }}
          />
          <div
            className='absolute top-[45%] right-[6%] w-12 h-12 rounded-xl border border-amber-500/10 bg-amber-500/3 animate-float-slow'
            style={{ animationDelay: '1.5s' }}
          />
        </div>
        <div className='relative max-w-5xl mx-auto px-6 text-center'>
          <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8 bg-primary/5 backdrop-blur-sm shadow-sm'>
            <Sparkles className='h-3.5 w-3.5 text-amber-500' />
            开源 · 免费 · 全栈质量保障平台
          </div>
          <h1 className='text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-6'>
            一站式 Web
            <br />
            <span className='bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 dark:from-blue-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent animate-gradient'>
              质量保障平台
            </span>
          </h1>
          <p className='text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed'>
            集性能测试、安全扫描、SEO 检测、无障碍审计、压力测试、API 自动化于一体。
            <br className='hidden md:block' />
            支持桌面端 + Web 端，让质量测试像写代码一样高效。
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-20'>
            <Button
              size='lg'
              className='h-13 px-10 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.02] transition-all duration-200 cursor-pointer'
              onClick={() => goApp('/history')}
            >
              <Play className='h-5 w-5 mr-2' />
              开始使用
            </Button>
            <Button
              size='lg'
              variant='outline'
              className='h-13 px-10 text-base hover:scale-[1.02] transition-all duration-200 cursor-pointer'
              onClick={() => window.open(GITHUB_URL, '_blank')}
            >
              <Github className='h-5 w-5 mr-2' />
              GitHub
            </Button>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto'>
            {STATS.map(s => (
              <div
                key={s.label}
                className='relative rounded-xl border bg-background/60 backdrop-blur-sm p-4 text-center hover:shadow-md hover:border-primary/15 transition-all duration-300 group'
              >
                <div className='text-3xl md:text-4xl font-extrabold bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all'>
                  {s.value}
                </div>
                <div className='text-xs text-muted-foreground mt-1 font-medium'>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 产品截图模拟 ── */}
      <section className='relative pb-24 md:pb-32'>
        {/* 背景光晕 */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/3 rounded-full blur-[150px] pointer-events-none' />
        <div className='max-w-5xl mx-auto px-6 relative' style={{ perspective: '1200px' }}>
          <div
            className='relative rounded-2xl p-px bg-gradient-to-b from-primary/25 via-primary/10 to-border/30 shadow-2xl shadow-primary/8 hover:shadow-3xl transition-shadow duration-500'
            style={{ transform: 'rotateX(2deg)', transformOrigin: 'center bottom' }}
          >
            {/* 微光扫过动画 */}
            <div className='absolute inset-0 rounded-2xl overflow-hidden pointer-events-none'>
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer' />
            </div>
            <div className='rounded-2xl bg-background overflow-hidden'>
              {/* 浏览器标题栏 */}
              <div className='flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30'>
                <div className='flex gap-1.5'>
                  <div className='w-3 h-3 rounded-full bg-red-400/80' />
                  <div className='w-3 h-3 rounded-full bg-amber-400/80' />
                  <div className='w-3 h-3 rounded-full bg-green-400/80' />
                </div>
                <div className='flex-1 flex justify-center'>
                  <div className='flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground max-w-xs w-full justify-center'>
                    <Lock className='h-3 w-3 text-emerald-500' />{' '}
                    <span className='opacity-70'>app.xiangweb.space</span>
                    <span className='font-medium'>/history</span>
                  </div>
                </div>
                <div className='flex gap-1.5'>
                  <div className='w-7 h-5 rounded bg-muted/40' />
                  <div className='w-7 h-5 rounded bg-muted/40' />
                </div>
              </div>
              <div className='flex'>
                {/* 侧边导航 */}
                <div className='hidden md:flex flex-col w-48 border-r bg-muted/10 p-3 gap-0.5'>
                  <div className='flex items-center gap-2 px-2.5 py-1.5 mb-2'>
                    <Globe className='h-4 w-4 text-primary' />
                    <span className='font-bold text-xs'>Test-Web</span>
                  </div>
                  {[
                    { label: '桌面端下载', active: false },
                    { label: '测试历史', active: true },
                    { label: '观测中心', active: false },
                    { label: '集合管理', active: false },
                    { label: '环境变量', active: false },
                    { label: '模板管理', active: false },
                  ].map(nav => (
                    <div
                      key={nav.label}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] ${nav.active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                    >
                      {nav.label}
                    </div>
                  ))}
                  <div className='mt-auto pt-3 border-t border-border/50'>
                    <div className='rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground'>
                      设置
                    </div>
                  </div>
                </div>
                {/* 主内容区 — 历史记录列表模拟 */}
                <div className='flex-1 p-5 md:p-6'>
                  <div className='flex items-center gap-3 mb-5'>
                    <span className='font-semibold text-sm'>测试历史</span>
                    <div className='ml-auto flex gap-2'>
                      <div className='h-7 px-3 rounded-lg bg-muted/40 flex items-center text-[11px] text-muted-foreground'>
                        🔍 搜索记录...
                      </div>
                      <div className='h-7 px-3 rounded-lg bg-muted/40 flex items-center text-[11px] text-muted-foreground'>
                        全部类型
                      </div>
                    </div>
                  </div>
                  {/* 统计卡片 */}
                  <div className='grid grid-cols-4 gap-3 mb-4'>
                    {[
                      {
                        value: '128',
                        label: '总测试数',
                        color: 'text-primary',
                        bg: 'bg-primary/5',
                        ring: 'border-primary/20',
                      },
                      {
                        value: '92%',
                        label: '成功率',
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-500/5',
                        ring: 'border-emerald-500/30',
                      },
                      {
                        value: '1.2s',
                        label: '平均耗时',
                        color: 'text-blue-500',
                        bg: 'bg-blue-500/5',
                        ring: 'border-blue-500/30',
                      },
                      {
                        value: '86',
                        label: '平均评分',
                        color: 'text-amber-500',
                        bg: 'bg-amber-500/5',
                        ring: 'border-amber-500/30',
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border-2 ${item.ring} ${item.bg} p-3 text-center`}
                      >
                        <div className={`text-2xl md:text-3xl font-bold ${item.color}`}>
                          {item.value}
                        </div>
                        <div className='text-[11px] text-muted-foreground mt-0.5 font-medium'>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 历史记录列表 */}
                  <div className='rounded-xl border divide-y'>
                    {[
                      {
                        name: 'example.com',
                        type: '性能',
                        score: '92',
                        status: '完成',
                        time: '2 分钟前',
                        color: 'text-emerald-500 bg-emerald-500/10',
                      },
                      {
                        name: 'shop.example.com',
                        type: '安全',
                        score: '87',
                        status: '完成',
                        time: '15 分钟前',
                        color: 'text-amber-500 bg-amber-500/10',
                      },
                      {
                        name: 'blog.example.com',
                        type: 'SEO',
                        score: '95',
                        status: '完成',
                        time: '1 小时前',
                        color: 'text-blue-500 bg-blue-500/10',
                      },
                      {
                        name: 'api.example.com',
                        type: 'API',
                        score: '—',
                        status: '完成',
                        time: '3 小时前',
                        color: 'text-violet-500 bg-violet-500/10',
                      },
                    ].map(row => (
                      <div key={row.name} className='flex items-center gap-3 px-3 py-2.5'>
                        <div className='flex-1 min-w-0'>
                          <div className='text-xs font-medium truncate'>{row.name}</div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.color}`}
                        >
                          {row.type}
                        </span>
                        <span className='text-[10px] font-semibold w-8 text-center text-emerald-500'>
                          {row.score}
                        </span>
                        <span className='text-[10px] text-muted-foreground w-16 text-right'>
                          {row.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 功能特性 ── */}
      <section id='features' className='py-24 md:py-32'>
        <div className='max-w-6xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-16'>
              <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                <Zap className='h-3 w-3 text-amber-500' /> 核心功能
              </div>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                覆盖 <GradientText>全质量维度</GradientText> 的测试能力
              </h2>
              <p className='text-muted-foreground max-w-xl mx-auto'>
                从单一 URL 测试到多步骤计划编排，满足从个人开发者到企业团队的全部需求
              </p>
            </div>
          </AnimatedEntry>
          {/* 核心功能：左右交错错落式布局 */}
          <div className='space-y-16 md:space-y-24 mb-16'>
            {FEATURES.slice(0, 3).map((f, i) => {
              const Icon = f.icon;
              const isReversed = i % 2 === 1;
              const miniVisuals = [
                /* 多引擎测试 — 仪表盘得分 */
                <div key='v0' className='grid grid-cols-2 gap-3'>
                  {[
                    { s: '96', l: '性能', c: 'text-emerald-500 border-emerald-500/30' },
                    { s: '89', l: '安全', c: 'text-amber-500 border-amber-500/30' },
                    { s: '94', l: 'SEO', c: 'text-blue-500 border-blue-500/30' },
                    { s: '82', l: '无障碍', c: 'text-violet-500 border-violet-500/30' },
                  ].map(d => (
                    <div
                      key={d.l}
                      className={`rounded-xl border-2 ${d.c} p-3 text-center bg-background`}
                    >
                      <div className={`text-2xl font-bold ${d.c.split(' ')[0]}`}>{d.s}</div>
                      <div className='text-[10px] text-muted-foreground mt-0.5'>{d.l}</div>
                    </div>
                  ))}
                </div>,
                /* 测试计划 — 流程图 */
                <div key='v1' className='space-y-3'>
                  {['性能扫描', 'SEO 检测', '安全审计', '报告生成'].map((step, si) => (
                    <div key={step} className='flex items-center gap-3'>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${si < 3 ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground'}`}
                      >
                        {si + 1}
                      </div>
                      <div className='flex-1 h-9 rounded-lg border bg-background flex items-center px-3 text-xs font-medium'>
                        {step}
                      </div>
                      {si < 3 && (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${si < 2 ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}
                        >
                          {si < 2 ? (
                            <Check className='h-3 w-3 text-emerald-500' />
                          ) : (
                            <div className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>,
                /* API 集合 — 请求列表 */
                <div key='v2' className='space-y-2'>
                  {[
                    { m: 'GET', c: 'text-emerald-500 bg-emerald-500/10', p: '/api/users' },
                    { m: 'POST', c: 'text-amber-500 bg-amber-500/10', p: '/api/auth/login' },
                    { m: 'PUT', c: 'text-blue-500 bg-blue-500/10', p: '/api/users/:id' },
                    { m: 'DEL', c: 'text-rose-500 bg-rose-500/10', p: '/api/sessions' },
                  ].map(r => (
                    <div
                      key={r.p}
                      className='flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2'
                    >
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.c}`}>
                        {r.m}
                      </span>
                      <code className='text-xs text-muted-foreground font-mono'>{r.p}</code>
                      <span className='ml-auto text-[10px] text-emerald-500 font-medium'>200</span>
                    </div>
                  ))}
                </div>,
              ];
              return (
                <div
                  key={f.title}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center ${isReversed ? 'md:direction-rtl' : ''}`}
                >
                  <AnimatedEntry direction={isReversed ? 'right' : 'left'} delay={100}>
                    <div className={isReversed ? 'md:order-2' : ''}>
                      <div
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bg} mb-4`}
                      >
                        <Icon className={`h-6 w-6 ${f.color}`} />
                      </div>
                      <h3 className='text-2xl font-bold mb-3 tracking-tight'>{f.title}</h3>
                      <p className='text-muted-foreground leading-relaxed text-base'>{f.desc}</p>
                    </div>
                  </AnimatedEntry>
                  <AnimatedEntry direction={isReversed ? 'left' : 'right'} delay={250}>
                    <div
                      className={`rounded-2xl border bg-muted/10 p-5 ${isReversed ? 'md:order-1' : ''}`}
                    >
                      {miniVisuals[i]}
                    </div>
                  </AnimatedEntry>
                </div>
              );
            })}
          </div>
          {/* 其余功能：紧凑小卡片 */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
            {FEATURES.slice(3).map((f, i) => {
              const Icon = f.icon;
              return (
                <AnimatedEntry
                  key={f.title}
                  delay={100 + i * 60}
                  direction={i < 3 ? 'left' : 'right'}
                >
                  <div className='group relative rounded-xl border p-5 hover:shadow-md hover:border-primary/10 transition-all duration-300 h-full text-center'>
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${f.bg} group-hover:scale-110 transition-transform duration-200 mb-3`}
                    >
                      <Icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <h3 className='font-semibold text-sm mb-1'>{f.title}</h3>
                    <p className='text-xs text-muted-foreground leading-relaxed'>{f.desc}</p>
                  </div>
                </AnimatedEntry>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 区块分隔 ── */}
      <div className='max-w-5xl mx-auto px-6'>
        <div className='h-px bg-gradient-to-r from-transparent via-border to-transparent' />
      </div>

      {/* ── 工作流 ── */}
      <section id='workflow' className='relative py-24 md:py-32 overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/15 to-transparent' />
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-500/3 rounded-full blur-[120px]' />
        </div>
        <div className='relative max-w-5xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-16'>
              <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                <Rocket className='h-3 w-3 text-primary' /> 工作流程
              </div>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                四步完成 <GradientText>质量闭环</GradientText>
              </h2>
            </div>
          </AnimatedEntry>
          {/* 竖向时间线 + 左右交错 */}
          <div className='relative max-w-3xl mx-auto'>
            {/* 中心线 */}
            <div className='hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent -translate-x-1/2' />
            <div className='space-y-10 md:space-y-16'>
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isLeft = i % 2 === 0;
                return (
                  <AnimatedEntry
                    key={step.title}
                    delay={i * 150}
                    direction={isLeft ? 'left' : 'right'}
                  >
                    <div
                      className={`relative flex items-start gap-6 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      {/* 内容卡片 */}
                      <div
                        className={`flex-1 group rounded-xl border bg-background p-5 hover:shadow-lg hover:border-primary/15 transition-all duration-300 ${isLeft ? 'md:mr-10' : 'md:ml-10'}`}
                      >
                        <div className='flex items-start gap-4'>
                          <div className='inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 shrink-0 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300'>
                            <Icon className='h-5 w-5 text-primary' />
                          </div>
                          <div>
                            <h3 className='font-semibold mb-1'>{step.title}</h3>
                            <p className='text-sm text-muted-foreground'>{step.desc}</p>
                          </div>
                        </div>
                      </div>
                      {/* 中心节点 */}
                      <div className='hidden md:flex absolute left-1/2 top-5 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center shadow-md z-10'>
                        {i + 1}
                      </div>
                      {/* 移动端序号 */}
                      <div className='md:hidden absolute -left-2 top-5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm'>
                        {i + 1}
                      </div>
                      {/* 另一侧占位 */}
                      <div className='hidden md:block flex-1' />
                    </div>
                  </AnimatedEntry>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── 优势亮点 ── */}
      <section className='py-24 md:py-32'>
        <div className='max-w-5xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-14'>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                为什么选择 <GradientText>Test-Web</GradientText>
              </h2>
            </div>
          </AnimatedEntry>
          {/* 不对称网格：左大右小 */}
          <div className='grid grid-cols-1 md:grid-cols-5 gap-5'>
            {/* 主角卡片：占 2 列 */}
            <AnimatedEntry direction='left' className='md:col-span-2 md:row-span-3'>
              {(() => {
                const a = ADVANTAGES[0];
                const Icon = a.icon;
                return (
                  <div className='group rounded-2xl border p-8 bg-gradient-to-b from-blue-500/10 to-blue-500/3 border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 h-full flex flex-col justify-center'>
                    <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background/80 shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300'>
                      <Icon className='h-7 w-7 text-primary' />
                    </div>
                    <h3 className='text-2xl font-bold mb-3'>{a.title}</h3>
                    <p className='text-muted-foreground leading-relaxed'>{a.desc}</p>
                  </div>
                );
              })()}
            </AnimatedEntry>
            {/* 右侧 3 个小卡片：各占 3 列 */}
            {ADVANTAGES.slice(1).map((a, i) => {
              const Icon = a.icon;
              const colors = [
                'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-amber-500/10',
                'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:shadow-violet-500/10',
                'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-emerald-500/10',
              ];
              return (
                <AnimatedEntry
                  key={a.title}
                  delay={100 + i * 80}
                  direction='right'
                  className='md:col-span-3'
                >
                  <div
                    className={`group rounded-xl border p-5 bg-gradient-to-r ${colors[i]} hover:shadow-lg transition-all duration-300 h-full`}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='inline-flex items-center justify-center w-11 h-11 rounded-xl bg-background/80 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-300'>
                        <Icon className='h-5 w-5 text-primary' />
                      </div>
                      <div>
                        <h3 className='font-semibold mb-0.5'>{a.title}</h3>
                        <p className='text-sm text-muted-foreground leading-relaxed'>{a.desc}</p>
                      </div>
                    </div>
                  </div>
                </AnimatedEntry>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 区块分隔 ── */}
      <div className='max-w-5xl mx-auto px-6'>
        <div className='h-px bg-gradient-to-r from-transparent via-border to-transparent' />
      </div>

      {/* ── 技术栈 ── */}
      <section id='tech' className='relative py-24 md:py-32 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-muted/25 via-muted/10 to-transparent pointer-events-none' />
        <div className='relative max-w-5xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-12'>
              <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                <Code2 className='h-3 w-3 text-primary' /> 技术栈
              </div>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight'>
                现代 <GradientText>全栈架构</GradientText>
              </h2>
            </div>
          </AnimatedEntry>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {TECH_STACK.map((t, i) => (
              <AnimatedEntry key={t.name} delay={i * 60}>
                <div className='group rounded-xl border bg-background p-4 text-center hover:shadow-md hover:border-primary/20 transition-all'>
                  <div className='text-base font-bold mb-0.5 group-hover:text-primary transition-colors'>
                    {t.name}
                  </div>
                  <div className='text-xs text-muted-foreground'>{t.desc}</div>
                </div>
              </AnimatedEntry>
            ))}
          </div>
        </div>
      </section>

      {/* ── 竞品对比 ── */}
      <section id='compare' className='py-24 md:py-32'>
        <div className='max-w-5xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-12'>
              <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                <Trophy className='h-3 w-3 text-amber-500' /> 功能对比
              </div>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                一个工具 <GradientText>替代多个</GradientText>
              </h2>
              <p className='text-muted-foreground max-w-xl mx-auto'>
                不再需要在 Lighthouse、Postman、JMeter 之间来回切换
              </p>
            </div>
          </AnimatedEntry>
          <AnimatedEntry delay={100}>
            <div className='rounded-2xl border overflow-hidden shadow-md'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-muted/30'>
                      {COMPARISON_DATA.headers.map((h, i) => (
                        <th
                          key={h}
                          className={`px-5 py-3.5 text-left font-semibold text-xs uppercase tracking-wider ${
                            i === 1
                              ? 'text-primary bg-primary/10 border-x-2 border-primary/15'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {i === 1 ? (
                            <div className='flex items-center gap-1.5'>
                              <Trophy className='h-3.5 w-3.5 text-amber-500' />
                              <span>{h}</span>
                            </div>
                          ) : (
                            h
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_DATA.rows.map((row, rowIdx) => (
                      <tr
                        key={row.feature}
                        className={`hover:bg-muted/8 transition-colors border-b border-border/30 ${rowIdx % 2 === 1 ? 'bg-muted/5' : ''}`}
                      >
                        <td className='px-5 py-3 font-medium text-sm'>{row.feature}</td>
                        {row.values.map((v, i) => (
                          <td
                            key={i}
                            className={`px-5 py-3 ${i === 0 ? 'bg-primary/5 border-x-2 border-primary/15' : ''}`}
                          >
                            {v ? (
                              <div
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${i === 0 ? 'bg-primary/15' : 'bg-green-500/10'}`}
                              >
                                <Check
                                  className={`h-3.5 w-3.5 ${i === 0 ? 'text-primary' : 'text-green-500'}`}
                                />
                              </div>
                            ) : (
                              <Minus className='h-4 w-4 text-muted-foreground/20' />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className='bg-muted/15 border-t-2 border-border/50'>
                      <td className='px-5 py-3.5 font-semibold text-sm'>总计</td>
                      {[12, 5, 5, 3].map((count, i) => (
                        <td
                          key={i}
                          className={`px-5 py-3.5 font-bold ${
                            i === 0
                              ? 'text-primary bg-primary/10 border-x-2 border-primary/15 text-xl'
                              : 'text-muted-foreground text-base'
                          }`}
                        >
                          {i === 0 ? (
                            <span className='text-primary font-extrabold'>{count}/12</span>
                          ) : (
                            `${count}/12`
                          )}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </AnimatedEntry>
        </div>
      </section>

      {/* ── 下载桌面端 ── */}
      <section id='download' className='relative py-24 md:py-32 overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/15 to-transparent' />
          <div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/3 rounded-full blur-[100px]' />
        </div>
        <div className='relative max-w-5xl mx-auto px-6'>
          <AnimatedEntry>
            <div className='text-center mb-12'>
              <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                <Download className='h-3 w-3 text-primary' /> 下载桌面端
              </div>
              <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                离线也能 <GradientText>全力测试</GradientText>
              </h2>
              <p className='text-muted-foreground max-w-xl mx-auto'>
                下载桌面端应用，享受本地数据库、离线使用、系统级压力测试等专属功能
              </p>
            </div>
          </AnimatedEntry>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
            {DOWNLOAD_PLATFORMS.map((p, i) => {
              const Icon = p.icon;
              return (
                <AnimatedEntry key={p.name} delay={i * 100}>
                  <div className='relative rounded-2xl p-px bg-gradient-to-b from-border via-border/50 to-transparent hover:from-primary/30 hover:via-primary/10 hover:to-transparent transition-all duration-300 group'>
                    <div className='rounded-2xl bg-background p-6 text-center h-full'>
                      <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300'>
                        <Icon className='h-8 w-8 text-primary' />
                      </div>
                      <h3 className='text-lg font-bold mb-1'>{p.name}</h3>
                      <p className='text-sm text-muted-foreground mb-5'>{p.desc}</p>
                      <Button
                        className='w-full cursor-pointer shadow-md hover:shadow-lg transition-shadow'
                        onClick={() => toast(`${p.name} 版本即将发布`)}
                      >
                        <Download className='h-4 w-4 mr-2' />
                        下载 {p.file}
                      </Button>
                    </div>
                  </div>
                </AnimatedEntry>
              );
            })}
          </div>
          <AnimatedEntry delay={350}>
            <p className='text-center text-xs text-muted-foreground mt-8'>
              也可以直接使用{' '}
              <button
                type='button'
                className='text-primary hover:underline font-medium cursor-pointer'
                onClick={() => goApp('/history')}
              >
                Web 版
              </button>
              ，无需下载安装
            </p>
          </AnimatedEntry>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id='faq' className='py-24 md:py-32'>
        <div className='max-w-5xl mx-auto px-6'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14'>
            {/* 左侧：标题区域（桌面端 sticky） */}
            <AnimatedEntry direction='left' className='md:col-span-4'>
              <div className='md:sticky md:top-24'>
                <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 text-xs font-medium text-muted-foreground mb-4'>
                  <HelpCircle className='h-3 w-3 text-primary' /> 常见问题
                </div>
                <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-4'>
                  常见 <GradientText>问题解答</GradientText>
                </h2>
                <p className='text-muted-foreground leading-relaxed'>
                  关于 Test-Web 的使用、安全、部署等常见疑问
                </p>
              </div>
            </AnimatedEntry>
            {/* 右侧：手风琴 */}
            <div className='md:col-span-8 space-y-2.5'>
              {FAQ_ITEMS.map((item, i) => (
                <AnimatedEntry key={i} delay={i * 80} direction='right'>
                  <details className='group rounded-xl border bg-background transition-all hover:shadow-sm open:shadow-md open:border-primary/15'>
                    <summary className='flex items-center justify-between cursor-pointer px-6 py-4 font-medium text-sm select-none'>
                      <span className='pr-4'>{item.q}</span>
                      <ChevronRight className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90 shrink-0' />
                    </summary>
                    <div className='px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 mx-3'>
                      {item.a}
                    </div>
                  </details>
                </AnimatedEntry>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className='relative py-28 md:py-40 overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-primary/8' />
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/6 rounded-full blur-[150px] animate-pulse-glow' />
          <div className='absolute top-[20%] left-[10%] w-20 h-20 rounded-full border border-primary/10 animate-float-slow' />
          <div
            className='absolute bottom-[20%] right-[10%] w-14 h-14 rounded-2xl border border-violet-500/10 animate-float-medium'
            style={{ animationDelay: '1.5s' }}
          />
        </div>
        <div className='relative max-w-3xl mx-auto px-6 text-center'>
          <AnimatedEntry>
            <h2 className='text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]'>
              准备好提升
              <br />
              <span className='bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 dark:from-blue-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent animate-gradient'>
                Web 质量
              </span>
              了吗？
            </h2>
            <p className='text-lg text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed'>
              下载桌面端执行测试，Web 端在线管理数据，云端自动同步
            </p>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
              <Button
                size='lg'
                className='h-14 px-12 text-base font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-200 cursor-pointer'
                onClick={() => goApp('/history')}
              >
                开始使用
                <ArrowRight className='h-5 w-5 ml-2' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='h-14 px-12 text-base hover:scale-[1.03] transition-all duration-200 cursor-pointer'
                onClick={() => window.open(GITHUB_URL, '_blank')}
              >
                <Github className='h-5 w-5 mr-2' />
                GitHub
              </Button>
            </div>
          </AnimatedEntry>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='border-t pt-16 pb-8'>
        <div className='max-w-7xl mx-auto px-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-8 mb-12'>
            <div className='col-span-2 md:col-span-1'>
              <div className='flex items-center gap-2 mb-3'>
                <Globe className='h-5 w-5 text-primary' />
                <span className='font-bold'>Test-Web</span>
              </div>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                开源全栈 Web 质量保障平台，覆盖性能、安全、SEO、无障碍等全维度测试。
              </p>
            </div>
            <div>
              <h4 className='font-semibold text-sm mb-3'>产品</h4>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <a href='#features' className='hover:text-foreground transition-colors'>
                    功能特性
                  </a>
                </li>
                <li>
                  <a href='#compare' className='hover:text-foreground transition-colors'>
                    功能对比
                  </a>
                </li>
                <li>
                  <a href='#download' className='hover:text-foreground transition-colors'>
                    下载桌面端
                  </a>
                </li>
                <li>
                  <button
                    type='button'
                    className='hover:text-foreground transition-colors cursor-pointer'
                    onClick={() => goApp('/history')}
                  >
                    在线体验
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold text-sm mb-3'>资源</h4>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <a href='#faq' className='hover:text-foreground transition-colors'>
                    常见问题
                  </a>
                </li>
                <li>
                  <button
                    type='button'
                    className='hover:text-foreground transition-colors cursor-pointer'
                    onClick={() => window.open(GITHUB_URL, '_blank')}
                  >
                    GitHub
                  </button>
                </li>
                <li>
                  <button
                    type='button'
                    className='hover:text-foreground transition-colors cursor-pointer'
                    onClick={() => goApp('/admin')}
                  >
                    管理后台
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold text-sm mb-3'>关于</h4>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>
                  <a href='#tech' className='hover:text-foreground transition-colors'>
                    技术栈
                  </a>
                </li>
                <li>
                  <button
                    type='button'
                    className='hover:text-foreground transition-colors cursor-pointer'
                    onClick={() => window.open(GITHUB_URL, '_blank')}
                  >
                    开源协议
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className='border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4'>
            <span className='text-xs text-muted-foreground'>
              &copy; {new Date().getFullYear()} Test-Web. All rights reserved.
            </span>
            <div className='flex items-center gap-4'>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                onClick={() => window.open(GITHUB_URL, '_blank')}
              >
                <Github className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
