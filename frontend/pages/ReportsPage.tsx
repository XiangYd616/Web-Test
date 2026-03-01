import {
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Statistic } from '@/components/ui/statistic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { buildReportConfig, generateHtmlReport, printHtmlReport } from '../utils/reportGenerator';

import {
  reportsApi,
  type CreateTemplatePayload,
  type ReportInstance,
  type ReportStatistics,
  type ReportTemplate,
} from '../services/reportsApi';

// ─── 常量 ───

const REPORT_TYPES = [
  { value: 'performance', labelKey: 'reports.typePerformance', fallback: '性能报告' },
  { value: 'security', labelKey: 'reports.typeSecurity', fallback: '安全报告' },
  { value: 'seo', labelKey: 'reports.typeSeo', fallback: 'SEO 报告' },
  { value: 'accessibility', labelKey: 'reports.typeAccessibility', fallback: '无障碍报告' },
  { value: 'compatibility', labelKey: 'reports.typeCompatibility', fallback: '兼容性报告' },
  { value: 'ux', labelKey: 'reports.typeUx', fallback: 'UX 报告' },
  { value: 'website', labelKey: 'reports.typeWebsite', fallback: '综合报告' },
];

const instanceStatusConfig: Record<
  string,
  {
    color: string;
    labelKey: string;
    fallback: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  completed: {
    color: 'text-green-600',
    labelKey: 'reports.statusCompleted',
    fallback: '已完成',
    icon: CheckCircle2,
  },
  generating: {
    color: 'text-blue-600',
    labelKey: 'reports.statusGenerating',
    fallback: '生成中',
    icon: Loader2,
  },
  pending: {
    color: 'text-yellow-600',
    labelKey: 'reports.statusPending',
    fallback: '等待中',
    icon: Clock,
  },
  failed: {
    color: 'text-red-600',
    labelKey: 'reports.statusFailed',
    fallback: '失败',
    icon: XCircle,
  },
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── 预置报告模板 ───

const REPORT_STYLE = `<style>
body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:24px;line-height:1.6}
h1{border-bottom:2px solid #2563eb;padding-bottom:8px;font-size:1.5rem}
h2{color:#2563eb;font-size:1.15rem;margin-top:1.5rem}
.score-box{display:inline-block;font-size:2rem;font-weight:700;padding:8px 20px;border-radius:8px;margin:8px 0}
.score-good{background:#dcfce7;color:#166534}.score-warn{background:#fef9c3;color:#854d0e}.score-bad{background:#fee2e2;color:#991b1b}
table{width:100%;border-collapse:collapse;margin:12px 0}th,td{text-align:left;padding:6px 12px;border-bottom:1px solid #e5e7eb}th{background:#f8fafc;font-weight:600;font-size:.85rem}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.75rem;margin:2px}
.tag-high{background:#fee2e2;color:#991b1b}.tag-medium{background:#fef9c3;color:#854d0e}.tag-low{background:#dcfce7;color:#166534}
.meta{color:#6b7280;font-size:.85rem}
ul{padding-left:20px}li{margin:4px 0}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:.75rem;text-align:center}
</style>`;

const DEFAULT_TEMPLATES: Record<string, string> = {
  performance: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>Core Web Vitals</h2>
<table><tr><th>指标</th><th>数值</th><th>评级</th></tr>
<tr><td>FCP (首次内容绘制)</td><td>{{fcp}}</td><td>{{fcpRating}}</td></tr>
<tr><td>LCP (最大内容绘制)</td><td>{{lcp}}</td><td>{{lcpRating}}</td></tr>
<tr><td>CLS (累积布局偏移)</td><td>{{cls}}</td><td>{{clsRating}}</td></tr>
<tr><td>TBT (总阻塞时间)</td><td>{{tbt}}</td><td>{{tbtRating}}</td></tr>
<tr><td>TTFB (首字节时间)</td><td>{{ttfb}}</td><td>{{ttfbRating}}</td></tr></table>
<h2>资源加载</h2>
<table><tr><th>类型</th><th>数量</th><th>大小</th></tr>
<tr><td>总请求</td><td>{{totalRequests}}</td><td>{{totalSize}}</td></tr>
<tr><td>JavaScript</td><td>{{jsCount}}</td><td>{{jsSize}}</td></tr>
<tr><td>CSS</td><td>{{cssCount}}</td><td>{{cssSize}}</td></tr>
<tr><td>图片</td><td>{{imageCount}}</td><td>{{imageSize}}</td></tr></table>
<h2>优化建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  security: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>安全概览</h2>
<table><tr><th>指标</th><th>结果</th></tr>
<tr><td>风险等级</td><td>{{riskLevel}}</td></tr>
<tr><td>漏洞总数</td><td>{{totalVulnerabilities}}</td></tr>
<tr><td>高风险</td><td>{{highRisk}}</td></tr>
<tr><td>中风险</td><td>{{mediumRisk}}</td></tr>
<tr><td>低风险</td><td>{{lowRisk}}</td></tr></table>
<h2>检测项</h2>
<table><tr><th>检查项</th><th>状态</th></tr>
<tr><td>HTTPS / TLS</td><td>{{httpsStatus}}</td></tr>
<tr><td>安全响应头</td><td>{{securityHeaders}}</td></tr>
<tr><td>XSS 防护</td><td>{{xssProtection}}</td></tr>
<tr><td>SQL 注入</td><td>{{sqlInjection}}</td></tr></table>
<h2>修复建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  seo: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>SEO 概览</h2>
<table><tr><th>指标</th><th>结果</th></tr>
<tr><td>问题总数</td><td>{{totalIssues}}</td></tr>
<tr><td>Meta 标签</td><td>{{metaScore}}</td></tr>
<tr><td>内容质量</td><td>{{contentScore}}</td></tr>
<tr><td>移动端优化</td><td>{{mobileScore}}</td></tr>
<tr><td>结构化数据</td><td>{{structuredData}}</td></tr></table>
<h2>优化建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  accessibility: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>无障碍合规</h2>
<table><tr><th>标准</th><th>通过率</th></tr>
<tr><td>WCAG A 级</td><td>{{wcagA}}</td></tr>
<tr><td>WCAG AA 级</td><td>{{wcagAA}}</td></tr>
<tr><td>ARIA 属性</td><td>{{ariaScore}}</td></tr>
<tr><td>键盘导航</td><td>{{keyboardNav}}</td></tr>
<tr><td>色彩对比</td><td>{{colorContrast}}</td></tr></table>
<h2>修复建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  compatibility: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>兼容性矩阵</h2>
<table><tr><th>项目</th><th>结果</th></tr>
<tr><td>测试浏览器数</td><td>{{browserCount}}</td></tr>
<tr><td>兼容通过率</td><td>{{passRate}}</td></tr>
<tr><td>CSS 兼容问题</td><td>{{cssIssues}}</td></tr>
<tr><td>JS 兼容问题</td><td>{{jsIssues}}</td></tr></table>
<h2>建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  ux: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>用户体验评估</h2>
<table><tr><th>维度</th><th>得分</th></tr>
<tr><td>视觉设计</td><td>{{visualScore}}</td></tr>
<tr><td>交互体验</td><td>{{interactionScore}}</td></tr>
<tr><td>内容可读性</td><td>{{readabilityScore}}</td></tr>
<tr><td>导航结构</td><td>{{navigationScore}}</td></tr></table>
<h2>优化建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,

  website: `${REPORT_STYLE}
<h1>{{title}}</h1>
<p class="meta">测试时间：{{date}} · 目标：{{url}}</p>
<div class="score-box {{scoreClass}}">{{score}} 分</div>
<h2>综合测试概览</h2>
<table><tr><th>模块</th><th>得分</th><th>状态</th></tr>
<tr><td>性能</td><td>{{performanceScore}}</td><td>{{performanceStatus}}</td></tr>
<tr><td>安全</td><td>{{securityScore}}</td><td>{{securityStatus}}</td></tr>
<tr><td>SEO</td><td>{{seoScore}}</td><td>{{seoStatus}}</td></tr>
<tr><td>无障碍</td><td>{{accessibilityScore}}</td><td>{{accessibilityStatus}}</td></tr></table>
<h2>主要问题</h2><ul>{{issues}}</ul>
<h2>改进建议</h2><ul>{{recommendations}}</ul>
<div class="footer">由 Test Web App 生成</div>`,
};

type PresetTemplate = {
  id: string;
  nameKey: string;
  nameFallback: string;
  type: string;
  descKey: string;
  descFallback: string;
};

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'perf-full',
    nameKey: 'reports.presetPerfName',
    nameFallback: '性能测试完整报告',
    type: 'performance',
    descKey: 'reports.presetPerfDesc',
    descFallback: '包含 Core Web Vitals、资源分析、优化建议',
  },
  {
    id: 'security-full',
    nameKey: 'reports.presetSecurityName',
    nameFallback: '安全扫描报告',
    type: 'security',
    descKey: 'reports.presetSecurityDesc',
    descFallback: '漏洞清单、安全头检测、修复优先级',
  },
  {
    id: 'seo-full',
    nameKey: 'reports.presetSeoName',
    nameFallback: 'SEO 优化报告',
    type: 'seo',
    descKey: 'reports.presetSeoDesc',
    descFallback: 'Meta 标签、内容质量、移动端优化',
  },
  {
    id: 'a11y-full',
    nameKey: 'reports.presetA11yName',
    nameFallback: '无障碍合规报告',
    type: 'accessibility',
    descKey: 'reports.presetA11yDesc',
    descFallback: 'WCAG 合规、ARIA、键盘导航',
  },
  {
    id: 'compat-full',
    nameKey: 'reports.presetCompatName',
    nameFallback: '兼容性测试报告',
    type: 'compatibility',
    descKey: 'reports.presetCompatDesc',
    descFallback: '浏览器矩阵、CSS/JS 兼容问题',
  },
  {
    id: 'ux-full',
    nameKey: 'reports.presetUxName',
    nameFallback: '用户体验报告',
    type: 'ux',
    descKey: 'reports.presetUxDesc',
    descFallback: '视觉设计、交互体验、可读性',
  },
  {
    id: 'website-full',
    nameKey: 'reports.presetWebsiteName',
    nameFallback: '综合测试报告',
    type: 'website',
    descKey: 'reports.presetWebsiteDesc',
    descFallback: '多维度评估汇总',
  },
];

const getDefaultTemplate = (type: string): string =>
  DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.performance;

// ─── 创建模板对话框 ───

const CreateTemplateDialog = ({
  open,
  onOpenChange,
  onSubmit,
  editTemplate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: CreateTemplatePayload) => Promise<void>;
  editTemplate?: ReportTemplate | null;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateTemplatePayload>({
    name: '',
    type: 'performance',
    description: '',
    template: getDefaultTemplate('performance'),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        setForm({
          name: editTemplate.name,
          type: editTemplate.type,
          description: editTemplate.description,
          template: editTemplate.template || getDefaultTemplate(editTemplate.type),
        });
      } else {
        setForm({
          name: '',
          type: 'performance',
          description: '',
          template: getDefaultTemplate('performance'),
        });
      }
    }
  }, [open, editTemplate]);

  const handleTypeChange = (type: string) => {
    setForm(prev => ({
      ...prev,
      type,
      template:
        prev.template === getDefaultTemplate(prev.type) ? getDefaultTemplate(type) : prev.template,
    }));
  };

  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error(t('reports.templateNameRequired', '请填写模板名称'));
      return;
    }
    if (!form.template?.trim()) {
      toast.error(t('reports.templateContentRequired', '请填写模板内容'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        t('reports.operationFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '操作失败: {{detail}}',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {editTemplate
              ? t('reports.editTemplate', '编辑报告模板')
              : t('reports.createTemplate', '创建报告模板')}
          </DialogTitle>
          <DialogDescription>
            {editTemplate
              ? t('reports.editTemplateDesc', '修改报告模板配置')
              : t('reports.createTemplateDesc', '创建一个新的报告模板')}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          {!editTemplate && (
            <div className='space-y-2'>
              <Label>{t('reports.selectPreset', '选择预置模板（推荐）')}</Label>
              <div className='grid grid-cols-2 gap-2'>
                {PRESET_TEMPLATES.map(preset => (
                  <button
                    key={preset.id}
                    type='button'
                    className={`text-left p-2.5 rounded-md border text-xs transition-colors ${
                      form.type === preset.type &&
                      form.name === t(preset.nameKey, preset.nameFallback)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      setForm({
                        name: t(preset.nameKey, preset.nameFallback),
                        type: preset.type,
                        description: t(preset.descKey, preset.descFallback),
                        template: getDefaultTemplate(preset.type),
                      })
                    }
                  >
                    <div className='font-medium truncate'>
                      {t(preset.nameKey, preset.nameFallback)}
                    </div>
                    <div className='text-muted-foreground mt-0.5 truncate'>
                      {t(preset.descKey, preset.descFallback)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className='space-y-2'>
            <Label>{t('reports.templateName', '模板名称')}</Label>
            <Input
              placeholder={t('reports.templateNamePlaceholder', '例如：月度性能报告')}
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className='space-y-2'>
            <Label>{t('reports.reportType', '报告类型')}</Label>
            <Select value={form.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {t(rt.labelKey, rt.fallback)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>{t('reports.templateDescription', '描述')}</Label>
            <Textarea
              placeholder={t('reports.templateDescPlaceholder', '模板描述...')}
              rows={2}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <details className='space-y-2'>
            <summary className='text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none'>
              {t('reports.advancedHtml', '高级：自定义模板 HTML')}
            </summary>
            <div className='pt-2 space-y-2'>
              <Textarea
                placeholder='<h1>{{title}}</h1>\n<p>评分：{{score}}</p>'
                rows={5}
                className='font-mono text-xs'
                value={form.template}
                onChange={e => setForm(prev => ({ ...prev, template: e.target.value }))}
              />
              <p className='text-xs text-muted-foreground'>
                {t('reports.htmlHint', '支持 HTML 格式，使用 {{variableName}} 插入变量')}
              </p>
            </div>
          </details>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel', '取消')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('common.submitting', '提交中...')
              : editTemplate
                ? t('common.save', '保存')
                : t('common.create', '创建')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 分享对话框 ───

const ShareDialog = ({
  open,
  onOpenChange,
  reportId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportId: string | null;
}) => {
  const { t } = useTranslation();
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateShare = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const result = await reportsApi.createShare(reportId);
      setShareUrl(
        result.url || `${window.location.origin}/api/system/reports/share/${result.token}`
      );
      toast.success(t('reports.shareLinkCreated', '分享链接已生成'));
    } catch {
      toast.error(t('reports.shareCreateFailed', '生成分享链接失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setShareUrl('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('reports.shareTitle', '分享报告')}</DialogTitle>
          <DialogDescription>
            {t('reports.shareDesc', '生成分享链接，他人可通过链接查看报告')}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          {shareUrl ? (
            <div className='space-y-2'>
              <Label>{t('reports.shareLink', '分享链接')}</Label>
              <div className='flex gap-2'>
                <Input value={shareUrl} readOnly className='font-mono text-xs' />
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl);
                    toast.success(t('common.copiedToClipboard', '已复制到剪贴板'));
                  }}
                >
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <div className='text-center py-4'>
              <Share2 className='h-10 w-10 mx-auto text-muted-foreground mb-3' />
              <p className='text-sm text-muted-foreground mb-4'>
                {t('reports.sharePrompt', '点击下方按钮生成分享链接')}
              </p>
              <Button onClick={handleCreateShare} disabled={loading}>
                {loading
                  ? t('reports.generating', '生成中...')
                  : t('reports.generateShareLink', '生成分享链接')}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.close', '关闭')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 主页面 ───

const ReportsPage = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [instances, setInstances] = useState<ReportInstance[]>([]);
  const [stats, setStats] = useState<ReportStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('instances');

  // 对话框
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ReportTemplate | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareReportId, setShareReportId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesResp, instancesResp, statsResp] = await Promise.allSettled([
        reportsApi.getTemplates(),
        reportsApi.getInstances({ limit: 50 }),
        reportsApi.getStatistics(),
      ]);

      if (templatesResp.status === 'fulfilled') {
        const data = templatesResp.value;
        setTemplates(Array.isArray(data) ? data : []);
      }
      if (instancesResp.status === 'fulfilled') {
        const data = instancesResp.value;
        setInstances(Array.isArray(data) ? data : []);
      }
      if (statsResp.status === 'fulfilled') {
        setStats(statsResp.value as ReportStatistics);
      }
    } catch {
      toast.error(t('reports.loadFailed', '加载报告数据失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    void loadData().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // 过滤
  const filteredInstances = useMemo(() => {
    return instances.filter(inst => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!inst.name?.toLowerCase().includes(q) && !inst.type?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (typeFilter !== 'all' && inst.type !== typeFilter) return false;
      if (statusFilter !== 'all' && inst.status !== statusFilter) return false;
      return true;
    });
  }, [instances, searchQuery, typeFilter, statusFilter]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tpl.name?.toLowerCase().includes(q) && !tpl.description?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (typeFilter !== 'all' && tpl.type !== typeFilter) return false;
      return true;
    });
  }, [templates, searchQuery, typeFilter]);

  // 操作
  const handleCreateTemplate = async (payload: CreateTemplatePayload) => {
    await reportsApi.createTemplate(payload);
    toast.success(t('reports.templateCreated', '模板创建成功'));
    void loadData();
  };

  const handleUpdateTemplate = async (payload: CreateTemplatePayload) => {
    if (!editTemplate) return;
    await reportsApi.updateTemplate(editTemplate.id, payload);
    toast.success(t('reports.templateUpdated', '模板更新成功'));
    setEditTemplate(null);
    void loadData();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await reportsApi.deleteTemplate(templateId);
      toast.success(t('reports.templateDeleted', '模板已删除'));
      void loadData();
    } catch {
      toast.error(t('reports.deleteTemplateFailed', '删除模板失败'));
    }
  };

  const handleExport = async (reportId: string, format: 'json' | 'pdf' | 'excel' = 'json') => {
    try {
      toast.info(
        t('reports.exporting', {
          format: format.toUpperCase(),
          defaultValue: '正在导出 {{format}}...',
        })
      );
      const result = await reportsApi.exportReports({ type: reportId, format });
      if (!result) {
        toast.error(t('reports.exportEmpty', '导出数据为空'));
        return;
      }

      // 桌面端：使用 Electron API 生成文件
      if (typeof window !== 'undefined' && window.electronAPI) {
        const api = window.electronAPI;
        if (format === 'pdf' && api.report?.generatePDF) {
          const filePath = await api.report.generatePDF(result);
          toast.success(
            t('reports.pdfGenerated', { path: filePath, defaultValue: 'PDF 已生成: {{path}}' })
          );
          if (api.report.openReport) void api.report.openReport(filePath);
          return;
        }
        if (format === 'excel' && api.report?.generateExcel) {
          const filePath = await api.report.generateExcel(result);
          toast.success(
            t('reports.excelGenerated', { path: filePath, defaultValue: 'Excel 已生成: {{path}}' })
          );
          if (api.report.openReport) void api.report.openReport(filePath);
          return;
        }
      }

      // Web 端：使用 Blob 下载
      const inst = instances.find(i => i.id === reportId);
      const fileName = `report_${inst?.name || reportId}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${fileName}.json`);
      } else if (format === 'pdf') {
        // Web 端 PDF: 生成 HTML 报告并触发浏览器打印
        const reportConfig = buildReportConfig(
          reportId,
          String((result as Record<string, unknown>).testType || 'website'),
          String((result as Record<string, unknown>).url || ''),
          result
        );
        const html = generateHtmlReport(reportConfig);
        printHtmlReport(html);
      } else if (format === 'excel') {
        // Web 端 Excel: 导出为 CSV
        const csvContent = convertToCSV(result);
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, `${fileName}.csv`);
      }

      toast.success(t('reports.exportSuccess', '导出成功'));
    } catch {
      toast.error(t('reports.exportFailed', '导出失败'));
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: Record<string, unknown>): string => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, flatten(value as Record<string, unknown>, path));
        } else {
          result[path] = String(value ?? '');
        }
      }
      return result;
    };
    const flat = flatten(data);
    const headers = Object.keys(flat);
    const values = Object.values(flat).map(v => `"${v.replace(/"/g, '""')}"`);
    return `${headers.join(',')}
${values.join(',')}`;
  };

  return (
    <div className='space-y-6 p-6 max-w-7xl mx-auto'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('reports.title', '报告管理')}</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('reports.description', '管理测试报告模板、查看报告实例、分享和导出')}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
          <Button size='sm' onClick={() => setTemplateDialogOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            {t('reports.createTemplate', '创建模板')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('reports.statTotal', '总报告')}
                value={stats.total}
                prefix={<FileText className='h-4 w-4 text-blue-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('reports.statCompleted', '已完成')}
                value={stats.byStatus?.completed || 0}
                prefix={<CheckCircle2 className='h-4 w-4 text-green-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('reports.statAvgTime', '平均耗时')}
                value={
                  stats.averageGenerationTime
                    ? `${(stats.averageGenerationTime / 1000).toFixed(1)}s`
                    : '-'
                }
                prefix={<Clock className='h-4 w-4 text-purple-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('reports.statTotalSize', '总大小')}
                value={formatFileSize(stats.totalFileSize)}
                prefix={<BarChart3 className='h-4 w-4 text-orange-500' />}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤栏 */}
      <div className='flex flex-wrap gap-3 items-center'>
        <div className='relative flex-1 min-w-[200px] max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('reports.searchPlaceholder', '搜索报告...')}
            className='pl-9'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('reports.filterType', '类型')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('reports.filterAllTypes', '全部类型')}</SelectItem>
            {REPORT_TYPES.map(rt => (
              <SelectItem key={rt.value} value={rt.value}>
                {t(rt.labelKey, rt.fallback)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('reports.filterStatus', '状态')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('reports.filterAllStatus', '全部状态')}</SelectItem>
            <SelectItem value='completed'>{t('reports.statusCompleted', '已完成')}</SelectItem>
            <SelectItem value='generating'>{t('reports.statusGenerating', '生成中')}</SelectItem>
            <SelectItem value='pending'>{t('reports.statusPending', '等待中')}</SelectItem>
            <SelectItem value='failed'>{t('reports.statusFailed', '失败')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='instances'>
            {t('reports.tabInstances', '报告实例')} ({filteredInstances.length})
          </TabsTrigger>
          <TabsTrigger value='templates'>
            {t('reports.tabTemplates', '报告模板')} ({filteredTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* 报告实例 */}
        <TabsContent value='instances'>
          <Card>
            <CardContent className='p-0'>
              {loading && instances.length === 0 ? (
                <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                  {t('common.loading', '加载中...')}
                </div>
              ) : filteredInstances.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2'>
                  <FileText className='h-8 w-8 opacity-30' />
                  <span>{t('reports.noInstances', '暂无报告实例')}</span>
                </div>
              ) : (
                <div className='divide-y'>
                  {filteredInstances.map(inst => {
                    const cfg = instanceStatusConfig[inst.status] || instanceStatusConfig.pending;
                    const StatusIcon = cfg.icon;
                    const rtMatch = REPORT_TYPES.find(rt => rt.value === inst.type);
                    const typeLabel = rtMatch ? t(rtMatch.labelKey, rtMatch.fallback) : inst.type;
                    return (
                      <div
                        key={inst.id}
                        className='flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors'
                      >
                        <StatusIcon
                          className={`h-4 w-4 shrink-0 ${cfg.color} ${inst.status === 'generating' ? 'animate-spin' : ''}`}
                        />
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-sm truncate'>{inst.name}</span>
                            <Badge variant='outline' className='text-[10px] shrink-0'>
                              {typeLabel}
                            </Badge>
                            <Badge variant='outline' className='text-[10px] shrink-0 uppercase'>
                              {inst.format}
                            </Badge>
                          </div>
                          <div className='text-xs text-muted-foreground mt-0.5'>
                            {new Date(inst.created_at).toLocaleString()}
                            {inst.file_size ? ` · ${formatFileSize(inst.file_size)}` : ''}
                            {inst.download_count > 0
                              ? ` · ${t('reports.downloadCount', { count: inst.download_count, defaultValue: '{{count}} 次下载' })}`
                              : ''}
                          </div>
                        </div>
                        <Badge variant='outline' className={`text-[10px] ${cfg.color}`}>
                          {t(cfg.labelKey, cfg.fallback)}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0'>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={() => void handleExport(inst.id, 'json')}>
                              <Download className='h-4 w-4 mr-2' />
                              {t('reports.exportJson', '导出 JSON')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleExport(inst.id, 'pdf')}>
                              <Printer className='h-4 w-4 mr-2' />
                              {t('reports.exportPdf', '导出 PDF')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleExport(inst.id, 'excel')}>
                              <FileSpreadsheet className='h-4 w-4 mr-2' />
                              {t('reports.exportExcel', '导出 Excel')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setShareReportId(inst.id);
                                setShareDialogOpen(true);
                              }}
                            >
                              <Share2 className='h-4 w-4 mr-2' />
                              {t('reports.share', '分享')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                void navigator.clipboard.writeText(inst.id);
                                toast.success(t('reports.idCopied', '报告 ID 已复制'));
                              }}
                            >
                              <ExternalLink className='h-4 w-4 mr-2' />
                              {t('reports.copyId', '复制 ID')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 报告模板 */}
        <TabsContent value='templates'>
          <Card>
            <CardContent className='p-0'>
              {loading && templates.length === 0 ? (
                <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                  {t('common.loading', '加载中...')}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2'>
                  <FileText className='h-8 w-8 opacity-30' />
                  <span>{t('reports.noTemplates', '暂无报告模板，点击「创建模板」开始')}</span>
                </div>
              ) : (
                <div className='divide-y'>
                  {filteredTemplates.map(tpl => {
                    const rtm = REPORT_TYPES.find(rt => rt.value === tpl.type);
                    const typeLabel = rtm ? t(rtm.labelKey, rtm.fallback) : tpl.type;
                    return (
                      <div
                        key={tpl.id}
                        className='flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors'
                      >
                        <FileText className='h-4 w-4 text-muted-foreground shrink-0' />
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-sm truncate'>{tpl.name}</span>
                            <Badge variant='outline' className='text-[10px] shrink-0'>
                              {typeLabel}
                            </Badge>
                          </div>
                          <div className='text-xs text-muted-foreground mt-0.5 truncate'>
                            {tpl.description || t('reports.noDescription', '无描述')}
                            {tpl.variables?.length
                              ? ` · ${t('reports.variableCount', { count: tpl.variables.length, defaultValue: '{{count}} 个变量' })}`
                              : ''}
                          </div>
                        </div>
                        <div className='text-xs text-muted-foreground shrink-0 hidden md:block'>
                          {new Date(tpl.updated_at || tpl.created_at).toLocaleString()}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0'>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditTemplate(tpl);
                                setTemplateDialogOpen(true);
                              }}
                            >
                              <FileText className='h-4 w-4 mr-2' />
                              {t('common.edit', '编辑')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                void navigator.clipboard.writeText(tpl.id);
                                toast.success(t('reports.templateIdCopied', '模板 ID 已复制'));
                              }}
                            >
                              <Copy className='h-4 w-4 mr-2' />
                              {t('reports.copyId', '复制 ID')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-red-600 focus:text-red-600'
                              onClick={() => void handleDeleteTemplate(tpl.id)}
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              {t('common.delete', '删除')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 创建/编辑模板对话框 */}
      <CreateTemplateDialog
        open={templateDialogOpen}
        onOpenChange={v => {
          setTemplateDialogOpen(v);
          if (!v) setEditTemplate(null);
        }}
        onSubmit={editTemplate ? handleUpdateTemplate : handleCreateTemplate}
        editTemplate={editTemplate}
      />

      {/* 分享对话框 */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        reportId={shareReportId}
      />
    </div>
  );
};

export { ReportsPage };
export default ReportsPage;
