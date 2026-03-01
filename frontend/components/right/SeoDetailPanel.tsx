/**
 * SEO 详情面板 — 展示每个检查项的深度信息
 * 用于 HistoryDetailPage 的"详情"Tab
 */
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';

/* ── 类型 ── */

type CheckDetail = {
  key: string;
  title: string;
  group: string;
  status: 'passed' | 'warning' | 'failed' | string;
  score: number;
  issues: string[];
  details: Record<string, unknown>;
};

/* ── 常量 ── */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const CHECK_LABELS: Record<string, string> = {
  meta: 'Meta 标签',
  headings: '标题结构',
  images: '图片优化',
  links: '链接结构',
  canonical: 'Canonical URL',
  openGraph: 'Open Graph',
  twitterCard: 'Twitter Card',
  hreflang: 'Hreflang 国际化',
  structuredData: '结构化数据',
  robots: 'Robots.txt',
  sitemap: 'Sitemap',
  deadLinks: '死链检测',
  favicon: 'Favicon',
  httpsRedirect: 'HTTPS 重定向',
  mobile: '移动端优化',
  content: '内容质量',
  accessibility: '可访问性',
  pwa: 'PWA',
};

const CHECK_GROUPS: Record<string, string> = {
  meta: 'SEO 核心',
  headings: 'SEO 核心',
  images: 'SEO 核心',
  links: 'SEO 核心',
  canonical: 'SEO 核心',
  openGraph: '社交媒体',
  twitterCard: '社交媒体',
  hreflang: '国际化',
  structuredData: '最佳实践',
  robots: '最佳实践',
  sitemap: '最佳实践',
  deadLinks: 'SEO 核心',
  favicon: '最佳实践',
  httpsRedirect: '最佳实践',
  mobile: '移动端与内容',
  content: '移动端与内容',
  accessibility: '移动端与内容',
  pwa: '移动端与内容',
};

const GROUP_ORDER = ['SEO 核心', '社交媒体', '最佳实践', '国际化', '移动端与内容'];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'passed') return <CheckCircle2 className='h-4 w-4 text-green-500 shrink-0' />;
  if (status === 'warning') return <AlertTriangle className='h-4 w-4 text-orange-500 shrink-0' />;
  return <XCircle className='h-4 w-4 text-red-500 shrink-0' />;
};

const statusBadge = (status: string) => {
  if (status === 'passed') return 'bg-green-500/10 text-green-700 border-green-200';
  if (status === 'warning') return 'bg-orange-500/10 text-orange-700 border-orange-200';
  return 'bg-red-500/10 text-red-700 border-red-200';
};

/* ── 详情字段渲染 ── */

const DETAIL_LABELS: Record<string, string> = {
  title: '页面标题',
  titleLength: '标题长度',
  description: '描述',
  descriptionLength: '描述长度',
  hasCharset: '字符集声明',
  hasViewport: 'Viewport',
  hasCanonical: 'Canonical',
  h1Count: 'H1 数量',
  totalHeadings: '标题总数',
  levelSkips: '层级跳跃',
  emptyCount: '空标题数',
  longCount: '过长标题数',
  totalImages: '图片总数',
  missingAlt: '缺少 Alt',
  missingDimensions: '缺少尺寸',
  missingLazyLoading: '缺少懒加载',
  dataUriCount: 'Data URI 数',
  totalLinks: '链接总数',
  internalLinks: '内部链接',
  externalLinks: '外部链接',
  nofollowCount: 'Nofollow 数',
  anchorTextDiversity: '锚文本多样性',
  checkedLinks: '已检测链接',
  deadLinks: '死链数',
  sampleSize: '抽样数',
  totalLinksOnPage: '页面链接总数',
  exists: '文件存在',
  hasUserAgent: 'User-Agent 指令',
  hasSitemap: 'Sitemap 引用',
  hasDirectives: '爬取指令',
  size: '文件大小',
  urlCount: 'URL 数量',
  hasLastmod: 'Lastmod',
  hasChangefreq: 'Changefreq',
  hasPriority: 'Priority',
  present: '标签存在',
  canonical: 'Canonical URL',
  hasJsonLd: 'JSON-LD',
  hasMicrodata: 'Microdata',
  hasRdfa: 'RDFa',
  hasManifest: 'Manifest',
  manifestValid: 'Manifest 有效',
  hasServiceWorker: 'Service Worker',
  hasThemeColor: 'Theme Color',
  hasLinkIcon: 'Link Icon',
  hasAppleIcon: 'Apple Touch Icon',
  iconHref: '图标路径',
  effectiveWordCount: '等效字数',
  cjkCount: '中文字数',
  englishWordCount: '英文词数',
  paragraphCount: '段落数',
  listCount: '列表数',
  tableCount: '表格数',
  richElements: '富内容元素',
  hasSkipLink: 'Skip Link',
  hasColorScheme: 'Color Scheme',
  htmlLang: 'HTML Lang',
  smallFontCount: '小字号元素',
  tappableElements: '可点击元素',
  tinyLinkCount: '极短链接',
  mobileFriendly: '移动端友好',
  pageSpeedScore: 'PageSpeed 分数',
};

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '✓ 是' : '✗ 否';
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('size')) return `${value} 字节`;
    return String(value);
  }
  if (typeof value === 'string') return value || '-';
  if (Array.isArray(value)) return `${value.length} 项`;
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

/* ── 单个检查项展开卡片 ── */

const CheckItemCard = ({ item }: { item: CheckDetail }) => {
  const [expanded, setExpanded] = useState(item.status !== 'passed');

  // 过滤掉复杂对象/数组，只展示简单值
  const simpleDetails = useMemo(() => {
    if (!item.details) return [];
    return Object.entries(item.details).filter(([k, v]) => {
      if (k === 'headings' || k === 'images' || k === 'links' || k === 'deadLinksList')
        return false;
      if (k === 'structuredData' || k === 'ogTags' || k === 'twitterTags') return false;
      if (k === 'sizes' || k === 'viewport' || k === 'responsiveImages' || k === 'mobileHints')
        return false;
      if (Array.isArray(v) || (isRecord(v) && Object.keys(v).length > 3)) return false;
      return true;
    });
  }, [item.details]);

  // 提取嵌套对象的简单字段
  const nestedDetails = useMemo(() => {
    if (!item.details) return [];
    const nested: Array<{ section: string; entries: [string, unknown][] }> = [];

    // viewport 对象
    if (isRecord(item.details.viewport)) {
      nested.push({
        section: 'Viewport',
        entries: Object.entries(item.details.viewport as Record<string, unknown>),
      });
    }
    // responsiveImages 对象
    if (isRecord(item.details.responsiveImages)) {
      nested.push({
        section: '响应式图片',
        entries: Object.entries(item.details.responsiveImages as Record<string, unknown>),
      });
    }
    // mobileHints 对象
    if (isRecord(item.details.mobileHints)) {
      nested.push({
        section: '移动端标记',
        entries: Object.entries(item.details.mobileHints as Record<string, unknown>),
      });
    }
    return nested;
  }, [item.details]);

  // OG / Twitter 标签
  const ogTags = useMemo(() => {
    if (!isRecord(item.details?.ogTags)) return null;
    return item.details.ogTags as Record<string, string>;
  }, [item.details]);

  const twitterTags = useMemo(() => {
    if (!isRecord(item.details?.twitterTags)) return null;
    return item.details.twitterTags as Record<string, string>;
  }, [item.details]);

  // 死链列表
  const deadLinksList = useMemo(() => {
    if (!Array.isArray(item.details?.deadLinksList)) return null;
    return item.details.deadLinksList as Array<{ url: string; status: number | string }>;
  }, [item.details]);

  // 结构化数据
  const structuredDataList = useMemo(() => {
    if (!Array.isArray(item.details?.structuredData)) return null;
    return item.details.structuredData as Array<Record<string, unknown>>;
  }, [item.details]);

  return (
    <div className='border rounded-lg overflow-hidden'>
      {/* 头部 */}
      <button
        className='w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left'
        onClick={() => setExpanded(!expanded)}
      >
        <StatusIcon status={item.status} />
        <span className='font-medium text-sm flex-1'>{item.title}</span>
        <Badge variant='outline' className={cn('text-[11px] px-2', statusBadge(item.status))}>
          {item.score}/100
        </Badge>
        {expanded ? (
          <ChevronDown className='h-4 w-4 text-muted-foreground' />
        ) : (
          <ChevronRight className='h-4 w-4 text-muted-foreground' />
        )}
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className='border-t px-4 py-3 space-y-3 bg-muted/10'>
          {/* 问题列表 */}
          {item.issues.length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                发现的问题
              </div>
              <div className='space-y-1.5'>
                {item.issues.map((issue, i) => (
                  <div key={i} className='flex items-start gap-2 text-sm'>
                    <Info className='h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0' />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.issues.length === 0 && item.status === 'passed' && (
            <div className='flex items-center gap-2 text-sm text-green-600'>
              <CheckCircle2 className='h-4 w-4' />
              <span>所有检查项均通过，表现优秀</span>
            </div>
          )}

          {/* 简单详情字段 */}
          {simpleDetails.length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                检测数据
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1.5'>
                {simpleDetails.map(([k, v]) => (
                  <div key={k} className='text-sm'>
                    <span className='text-muted-foreground'>{DETAIL_LABELS[k] || k}：</span>
                    <span className='font-medium'>{formatDetailValue(k, v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 嵌套详情 */}
          {nestedDetails.map(({ section, entries }) => (
            <div key={section}>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                {section}
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5'>
                {entries.map(([k, v]) => (
                  <div key={k} className='text-sm'>
                    <span className='text-muted-foreground'>{DETAIL_LABELS[k] || k}：</span>
                    <span className='font-medium'>{formatDetailValue(k, v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* OG 标签 */}
          {ogTags && Object.keys(ogTags).length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                Open Graph 标签
              </div>
              <div className='rounded border divide-y'>
                {Object.entries(ogTags).map(([k, v]) => (
                  <div key={k} className='flex items-center gap-2 px-3 py-1.5 text-sm'>
                    <code className='text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0'>
                      {k}
                    </code>
                    <span className='truncate text-muted-foreground' title={v}>
                      {v || <span className='italic'>空</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Twitter 标签 */}
          {twitterTags && Object.keys(twitterTags).length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                Twitter Card 标签
              </div>
              <div className='rounded border divide-y'>
                {Object.entries(twitterTags).map(([k, v]) => (
                  <div key={k} className='flex items-center gap-2 px-3 py-1.5 text-sm'>
                    <code className='text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0'>
                      {k}
                    </code>
                    <span className='truncate text-muted-foreground' title={v}>
                      {v || <span className='italic'>空</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 死链列表 */}
          {deadLinksList && deadLinksList.length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                死链列表
              </div>
              <div className='rounded border divide-y'>
                {deadLinksList.map((link, i) => (
                  <div key={i} className='flex items-center gap-2 px-3 py-1.5 text-sm'>
                    <Badge
                      variant='outline'
                      className='text-[10px] px-1.5 bg-red-500/10 text-red-700 border-red-200 shrink-0'
                    >
                      {link.status}
                    </Badge>
                    <span className='truncate font-mono text-xs' title={link.url}>
                      {link.url}
                    </span>
                    <a
                      href={link.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='shrink-0'
                    >
                      <ExternalLink className='h-3 w-3 text-muted-foreground' />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 结构化数据 */}
          {structuredDataList && structuredDataList.length > 0 && (
            <div>
              <div className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                结构化数据
              </div>
              <div className='rounded border divide-y'>
                {structuredDataList.map((sd, i) => (
                  <div key={i} className='flex items-center gap-2 px-3 py-1.5 text-sm'>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] px-1.5 shrink-0',
                        sd.valid
                          ? 'bg-green-500/10 text-green-700 border-green-200'
                          : 'bg-red-500/10 text-red-700 border-red-200'
                      )}
                    >
                      {sd.valid ? '有效' : '无效'}
                    </Badge>
                    <span className='font-medium'>{String(sd.type || '未知')}</span>
                    {sd.schema != null && (
                      <span className='text-muted-foreground text-xs'>
                        @type: {String(sd.schema)}
                      </span>
                    )}
                    {sd.error != null && (
                      <span className='text-red-500 text-xs truncate'>{String(sd.error)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── 主组件 ── */

const SeoDetailPanel = () => {
  const { resultPayloadText } = useTestResult();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  // 数据提取逻辑与 SeoChartPanel 一致
  const seoDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) return null;
    const engineResult = (results as Record<string, unknown>).seo;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult))
      return null;
    const details = (engineResult as { details?: unknown }).details;
    return details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  }, [parsedPayload]);

  const summaryFallback = useMemo<Record<string, unknown> | null>(() => {
    if (seoDetails) return null;
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const s = summary as Record<string, unknown>;
    if (!s.seoChecks && !s.seoSummary) return null;
    return {
      checks: s.seoChecks,
      summary: s.seoSummary,
      detailedAnalysis: s.seoDetailedAnalysis,
    };
  }, [seoDetails, parsedPayload]);

  const effectiveDetails = useMemo(
    () => seoDetails || summaryFallback,
    [seoDetails, summaryFallback]
  );

  // 构建检查项列表（含 details）
  const checkItems = useMemo<CheckDetail[]>(() => {
    if (!effectiveDetails) return [];

    const checksData = isRecord(effectiveDetails.checks)
      ? (effectiveDetails.checks as Record<string, unknown>)
      : null;

    if (checksData && Object.keys(checksData).length > 0) {
      return Object.entries(checksData)
        .filter(([, v]) => isRecord(v))
        .map(([key, v]) => {
          const check = v as Record<string, unknown>;
          return {
            key,
            title: CHECK_LABELS[key] || key,
            group: CHECK_GROUPS[key] || '其他',
            status: String(check.status || 'failed'),
            score: Number(check.score ?? 0),
            issues: Array.isArray(check.issues) ? (check.issues as string[]) : [],
            details: isRecord(check.details) ? (check.details as Record<string, unknown>) : {},
          };
        });
    }
    return [];
  }, [effectiveDetails]);

  // 按分组归类
  const groupedChecks = useMemo(() => {
    const groups: Record<string, CheckDetail[]> = {};
    for (const item of checkItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return GROUP_ORDER.filter(g => groups[g]).map(g => ({ group: g, items: groups[g] }));
  }, [checkItems]);

  // 统计
  const stats = useMemo(() => {
    const passed = checkItems.filter(c => c.status === 'passed').length;
    const warned = checkItems.filter(c => c.status === 'warning').length;
    const failed = checkItems.filter(c => c.status === 'failed').length;
    const totalIssues = checkItems.reduce((s, c) => s + c.issues.length, 0);
    return { total: checkItems.length, passed, warned, failed, totalIssues };
  }, [checkItems]);

  // detailedAnalysis 层数据
  const detailedAnalysis = useMemo(() => {
    if (!effectiveDetails) return null;
    const da = effectiveDetails.detailedAnalysis;
    if (!isRecord(da)) return null;
    return da as {
      strengths?: Array<{ category?: string; score?: number; description?: string }>;
      weaknesses?: Array<{
        category?: string;
        score?: number;
        description?: string;
        impact?: number;
      }>;
      actionPlan?: {
        immediate?: Array<{ category?: string; priority?: string; issues?: string[] }>;
        shortTerm?: Array<{ category?: string; priority?: string; issues?: string[] }>;
        longTerm?: Array<{ category?: string; priority?: string; issues?: string[] }>;
      };
    };
  }, [effectiveDetails]);

  const hasAny = checkItems.length > 0;

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>SEO 检测详情</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行 SEO 测试后，详细检测结果将在此展示
          </div>
        )}

        {hasAny && (
          <div className='space-y-6'>
            {/* 统计概览 */}
            <div className='flex flex-wrap gap-3'>
              <Badge variant='outline' className='text-sm px-3 py-1'>
                共 {stats.total} 项检测
              </Badge>
              {stats.passed > 0 && (
                <Badge className='bg-green-500/10 text-green-700 border-green-200 text-sm px-3 py-1'>
                  <CheckCircle2 className='h-3.5 w-3.5 mr-1' />
                  {stats.passed} 通过
                </Badge>
              )}
              {stats.warned > 0 && (
                <Badge className='bg-orange-500/10 text-orange-700 border-orange-200 text-sm px-3 py-1'>
                  <AlertTriangle className='h-3.5 w-3.5 mr-1' />
                  {stats.warned} 警告
                </Badge>
              )}
              {stats.failed > 0 && (
                <Badge className='bg-red-500/10 text-red-700 border-red-200 text-sm px-3 py-1'>
                  <XCircle className='h-3.5 w-3.5 mr-1' />
                  {stats.failed} 失败
                </Badge>
              )}
              {stats.totalIssues > 0 && (
                <Badge variant='outline' className='text-sm px-3 py-1'>
                  共 {stats.totalIssues} 个问题
                </Badge>
              )}
            </div>

            {/* 分组检查项 */}
            {groupedChecks.map(({ group, items }) => (
              <div key={group}>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {group}
                </h4>
                <div className='space-y-2'>
                  {items.map(item => (
                    <CheckItemCard key={item.key} item={item} />
                  ))}
                </div>
              </div>
            ))}

            {/* 行动计划 */}
            {detailedAnalysis?.actionPlan &&
              ((detailedAnalysis.actionPlan.immediate?.length ?? 0) > 0 ||
                (detailedAnalysis.actionPlan.shortTerm?.length ?? 0) > 0 ||
                (detailedAnalysis.actionPlan.longTerm?.length ?? 0) > 0) && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    修复行动计划
                  </h4>
                  <div className='space-y-3'>
                    {(
                      [
                        {
                          key: 'immediate',
                          title: '🔴 立即修复',
                          color: 'border-red-200 bg-red-500/5',
                          items: detailedAnalysis.actionPlan.immediate,
                        },
                        {
                          key: 'shortTerm',
                          title: '🟡 短期计划（1-4 周）',
                          color: 'border-orange-200 bg-orange-500/5',
                          items: detailedAnalysis.actionPlan.shortTerm,
                        },
                        {
                          key: 'longTerm',
                          title: '🔵 长期优化',
                          color: 'border-blue-200 bg-blue-500/5',
                          items: detailedAnalysis.actionPlan.longTerm,
                        },
                      ] as const
                    ).map(
                      group =>
                        (group.items?.length ?? 0) > 0 && (
                          <div key={group.key} className={cn('rounded-lg border p-3', group.color)}>
                            <div className='font-medium text-sm mb-2'>{group.title}</div>
                            <div className='space-y-2'>
                              {(group.items ?? []).map((item, i) => (
                                <div key={i} className='text-sm'>
                                  <div className='flex items-center gap-2'>
                                    <span className='font-medium'>
                                      {CHECK_LABELS[item.category || ''] || item.category}
                                    </span>
                                    {item.priority && (
                                      <Badge variant='outline' className='text-[10px] px-1.5'>
                                        {item.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  {(item.issues?.length ?? 0) > 0 && (
                                    <ul className='mt-1 ml-4 space-y-0.5'>
                                      {(item.issues ?? []).map((issue, j) => (
                                        <li
                                          key={j}
                                          className='text-xs text-muted-foreground list-disc'
                                        >
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

            {/* 优势与劣势 */}
            {detailedAnalysis &&
              ((detailedAnalysis.strengths?.length ?? 0) > 0 ||
                (detailedAnalysis.weaknesses?.length ?? 0) > 0) && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {(detailedAnalysis.strengths?.length ?? 0) > 0 && (
                    <div>
                      <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                        ✅ 优势项
                      </h4>
                      <div className='space-y-2'>
                        {(detailedAnalysis.strengths ?? []).map((s, i) => (
                          <div
                            key={i}
                            className='rounded border border-green-200 bg-green-500/5 p-2.5 text-sm'
                          >
                            <div className='flex items-center gap-2'>
                              <CheckCircle2 className='h-4 w-4 text-green-500' />
                              <span className='font-medium'>
                                {CHECK_LABELS[s.category || ''] || s.category}
                              </span>
                              <Badge
                                variant='outline'
                                className='text-[10px] px-1.5 bg-green-500/10 text-green-700 border-green-200'
                              >
                                {s.score}
                              </Badge>
                            </div>
                            {s.description && (
                              <p className='text-xs text-muted-foreground mt-1 ml-6'>
                                {s.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(detailedAnalysis.weaknesses?.length ?? 0) > 0 && (
                    <div>
                      <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                        ⚠️ 待改进项
                      </h4>
                      <div className='space-y-2'>
                        {(detailedAnalysis.weaknesses ?? []).map((w, i) => (
                          <div
                            key={i}
                            className='rounded border border-orange-200 bg-orange-500/5 p-2.5 text-sm'
                          >
                            <div className='flex items-center gap-2'>
                              <AlertTriangle className='h-4 w-4 text-orange-500' />
                              <span className='font-medium'>
                                {CHECK_LABELS[w.category || ''] || w.category}
                              </span>
                              <Badge
                                variant='outline'
                                className={cn(
                                  'text-[10px] px-1.5',
                                  (w.score ?? 0) < 30
                                    ? 'bg-red-500/10 text-red-700 border-red-200'
                                    : 'bg-orange-500/10 text-orange-700 border-orange-200'
                                )}
                              >
                                {w.score}
                              </Badge>
                              {w.impact !== undefined && (
                                <span className='text-xs text-muted-foreground'>
                                  影响 {w.impact}/10
                                </span>
                              )}
                            </div>
                            {w.description && (
                              <p className='text-xs text-muted-foreground mt-1 ml-6'>
                                {w.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoDetailPanel;
