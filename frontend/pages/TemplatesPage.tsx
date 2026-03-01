import { zodResolver } from '@hookform/resolvers/zod';
import {
  Clock,
  Copy,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Share2,
  Tag,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
  TEST_TYPE_LABELS,
  type TemplateItem,
  type TestType,
  useTestConfig,
  useTestTemplates,
  useTestWorkspace,
} from '../context/TestContext';
import { previewTemplate } from '../services/testApi';

/* ── 引擎类型颜色映射 ── */
const ENGINE_COLORS: Record<string, string> = {
  performance: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  security: 'text-red-600 bg-red-500/10 border-red-500/20',
  seo: 'text-green-600 bg-green-500/10 border-green-500/20',
  api: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
  stress: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  accessibility: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  compatibility: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
  ux: 'text-pink-600 bg-pink-500/10 border-pink-500/20',
  website: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
};

/* ── 表单 Schema ── */
const formSchema = z.object({
  name: z.string().min(1, { message: 'templates.nameRequired' }),
  description: z.string().optional(),
  engineType: z.string(),
  config: z.string().refine(
    val => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'templates.configError' }
  ),
  isPublic: z.boolean().default(false),
  isDefault: z.boolean().default(false),
});

type TemplateFormValues = z.input<typeof formSchema>;

const TemplatesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTestTemplates();
  const { selectTemplate, configText, selectedType } = useTestConfig();
  const { workspaceId } = useTestWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TemplateItem | null>(null);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    id: string;
    vars: string;
    content: string;
    loading: boolean;
  } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      engineType: selectedType,
      isPublic: false,
      isDefault: false,
      config: configText,
    },
  });

  const engineOptions = useMemo(
    () => Object.entries(TEST_TYPE_LABELS).map(([value, label]) => ({ label: t(label), value })),
    [t]
  );

  useEffect(() => {
    if (isFormOpen) {
      form.reset({
        name: editingTemplate?.name || '',
        description: editingTemplate?.description || '',
        engineType: editingTemplate?.engineType || selectedType,
        isPublic: !!editingTemplate?.isPublic,
        isDefault: !!editingTemplate?.isDefault,
        config: editingTemplate ? JSON.stringify(editingTemplate.config, null, 2) : configText,
      });
    }
  }, [isFormOpen, editingTemplate, form, selectedType, configText]);

  /* ── 筛选 ── */
  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (filterType !== 'all') {
      list = list.filter(item => item.engineType === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        item =>
          item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, filterType, searchQuery]);

  /* ── 按引擎类型分组 ── */
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, TemplateItem[]> = {};
    for (const item of filteredTemplates) {
      const key = item.engineType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filteredTemplates]);

  /* ── 版本命名 ── */
  const resolveBaseName = (name: string) => {
    const match = name.match(/\s+v(\d+)$/i);
    return match
      ? { base: name.slice(0, match.index).trim(), version: Number(match[1]) || 1 }
      : { base: name, version: 1 };
  };

  const getNextVersionName = (name: string) => {
    const { base } = resolveBaseName(name);
    const versions = templates
      .map(item => resolveBaseName(item.name))
      .filter(item => item.base === base)
      .map(item => item.version);
    const nextVersion = versions.length ? Math.max(...versions) + 1 : 2;
    return `${base} v${nextVersion}`;
  };

  /* ── 操作 ── */
  const handleAction = async (
    action: () => Promise<void>,
    successMsg: string,
    errorMsg: string
  ) => {
    try {
      await action();
      toast.success(t(successMsg));
    } catch (error) {
      toast.error((error as Error).message || t(errorMsg));
    }
  };

  const onSubmit = async (values: TemplateFormValues) => {
    const payload = {
      ...values,
      isPublic: values.isPublic ?? false,
      isDefault: values.isDefault ?? false,
      config: JSON.parse(values.config),
    };
    const action = editingTemplate
      ? () => updateTemplate(editingTemplate.id, payload)
      : () => createTemplate(payload);
    await handleAction(action, 'templates.saveSuccess', 'templates.saveFailed');
    setFormOpen(false);
    setEditingTemplate(null);
  };

  const handleUseTemplate = useCallback(
    (item: TemplateItem) => {
      selectTemplate(item.id);
      navigate('/dashboard');
    },
    [selectTemplate, navigate]
  );

  /* ── 导入（并发池，最多 4 并发） ── */
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const concurrency = 4;
      let idx = 0;
      let failed = 0;
      const runNext = async (): Promise<void> => {
        while (idx < items.length) {
          const item = items[idx++];
          try {
            await createTemplate({
              name: String(item.name || 'Imported Template'),
              description: String(item.description || ''),
              engineType: String(item.engineType || item.engine_type || 'performance'),
              config: item.config || {},
              isPublic: Boolean(item.isPublic),
              isDefault: false,
            });
          } catch {
            failed++;
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => runNext())
      );
      if (failed > 0) {
        toast.warning(
          t('templates.importPartial', {
            total: items.length,
            failed,
            defaultValue: `导入完成，${failed}/${items.length} 条失败`,
          })
        );
      } else {
        toast.success(t('templates.importSuccess', { name: items[0]?.name || 'Template' }));
      }
    } catch {
      toast.error(t('templates.importFailed'));
    }
  };

  /* ── 导出 ── */
  const handleExport = (item: TemplateItem) => {
    const data = {
      name: item.name,
      description: item.description,
      engineType: item.engineType,
      config: item.config,
      isPublic: item.isPublic,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/\s+/g, '_')}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('templates.exportSuccess'));
  };

  const handleExportAll = () => {
    const data = templates.map(item => ({
      name: item.name,
      description: item.description,
      engineType: item.engineType,
      config: item.config,
      isPublic: item.isPublic,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'templates_export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('templates.exportSuccess'));
  };

  /* ── 预览 ── */
  const runPreview = async (templateId: string, variables: string) => {
    setPreviewData(prev =>
      prev
        ? { ...prev, id: templateId, loading: true }
        : { id: templateId, vars: variables, content: '', loading: true }
    );
    try {
      const data = await previewTemplate(templateId, {
        variables: JSON.parse(variables || '{}'),
        workspaceId: workspaceId || undefined,
      });
      const previewConfig = (data as { previewConfig?: Record<string, unknown> }).previewConfig;
      setPreviewData(prev =>
        prev
          ? { ...prev, content: JSON.stringify(previewConfig || data, null, 2), loading: false }
          : null
      );
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? t('templates.previewVarError')
          : (error as Error).message || t('templates.previewError')
      );
      setPreviewData(prev => (prev ? { ...prev, loading: false } : null));
    }
  };

  /* ── 统计 ── */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of templates) {
      counts[item.engineType] = (counts[item.engineType] || 0) + 1;
    }
    return counts;
  }, [templates]);

  return (
    <div className='container py-6 space-y-6 max-w-7xl mx-auto'>
      {/* ── 顶部标题栏 ── */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('templates.title')}</h2>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('templates.templateCount', { count: templates.length })}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <input
            ref={importFileRef}
            type='file'
            accept='.json'
            className='hidden'
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
          <Button variant='outline' size='sm' onClick={() => importFileRef.current?.click()}>
            <Upload className='h-4 w-4 mr-1' />
            {t('templates.importBtn')}
          </Button>
          {templates.length > 0 && (
            <Button variant='outline' size='sm' onClick={handleExportAll}>
              <Download className='h-4 w-4 mr-1' />
              {t('templates.exportBtn')}
            </Button>
          )}
          <Button
            size='sm'
            onClick={() => {
              setEditingTemplate(null);
              setFormOpen(true);
            }}
          >
            <Plus className='h-4 w-4 mr-1' />
            {t('templates.add')}
          </Button>
        </div>
      </div>

      {/* ── 搜索 + 筛选 ── */}
      <div className='flex items-center gap-3'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('templates.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-8 h-9'
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className='w-[160px] h-9'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('templates.allTypes')}</SelectItem>
            {engineOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
                {typeCounts[opt.value] ? ` (${typeCounts[opt.value]})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── 主体内容 ── */}
      {filteredTemplates.length === 0 ? (
        <Card className='flex flex-col items-center justify-center p-12 text-muted-foreground bg-muted/10 border-dashed min-h-[300px]'>
          <div className='text-center space-y-3'>
            <div className='bg-background p-4 rounded-full inline-flex mb-2 shadow-sm'>
              <FileCode2 className='w-8 h-8 text-muted-foreground/50' />
            </div>
            <h3 className='text-lg font-medium text-foreground'>
              {templates.length === 0 ? t('templates.noTemplates') : t('templates.noMatch')}
            </h3>
            {templates.length === 0 && (
              <>
                <p className='text-sm'>{t('templates.noTemplatesHint')}</p>
                <div className='flex items-center justify-center gap-2 pt-2'>
                  <Button
                    size='sm'
                    onClick={() => {
                      setEditingTemplate(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className='h-3.5 w-3.5 mr-1' />
                    {t('templates.createTitle')}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Upload className='h-3.5 w-3.5 mr-1' />
                    {t('templates.importBtn')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-12 gap-6 items-start'>
          {/* 左侧：模板列表 */}
          <div className='md:col-span-5 space-y-4'>
            {Object.entries(groupedTemplates).map(([engineType, items]) => (
              <div key={engineType}>
                <div className='flex items-center gap-2 mb-2'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'text-[10px] font-bold border uppercase',
                      ENGINE_COLORS[engineType] || 'text-muted-foreground'
                    )}
                  >
                    {t(TEST_TYPE_LABELS[engineType as TestType] ?? engineType)}
                  </Badge>
                  <span className='text-xs text-muted-foreground'>({items.length})</span>
                </div>
                <div className='space-y-1'>
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border border-transparent',
                        selectedDetail?.id === item.id
                          ? 'bg-accent border-border shadow-sm'
                          : 'hover:bg-muted/50'
                      )}
                      role='button'
                      tabIndex={0}
                      onClick={() => setSelectedDetail(item)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedDetail(item);
                      }}
                    >
                      <div className='flex-1 overflow-hidden'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-sm truncate'>{item.name}</span>
                          {item.isOfficial && (
                            <Badge className='text-[10px] h-4 px-1 bg-blue-600 text-white border-none hover:bg-blue-700'>
                              {t('templates.official', '官方')}
                            </Badge>
                          )}
                          {item.isPublic && !item.isOfficial && (
                            <Badge variant='secondary' className='text-[10px] h-4 px-1'>
                              {t('templates.shared')}
                            </Badge>
                          )}
                          {item.isDefault && (
                            <Badge variant='outline' className='text-[10px] h-4 px-1'>
                              {t('templates.default')}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <div className='text-xs text-muted-foreground truncate mt-0.5'>
                            {item.description}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={e => e.stopPropagation()}
                          >
                            <MoreVertical className='h-3.5 w-3.5' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => handleUseTemplate(item)}>
                            <FileCode2 className='mr-2 h-4 w-4' />
                            {t('templates.useTemplate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTemplate(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className='mr-2 h-4 w-4' />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(
                                () =>
                                  createTemplate({
                                    ...item,
                                    name: `${item.name} Copy`,
                                    isPublic: false,
                                    isDefault: false,
                                  }),
                                'templates.copySuccess',
                                'templates.copyFailed'
                              )
                            }
                          >
                            <Copy className='mr-2 h-4 w-4' />
                            {t('templates.duplicateTemplate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(
                                () =>
                                  createTemplate({
                                    ...item,
                                    name: getNextVersionName(item.name),
                                    isDefault: false,
                                  }),
                                'templates.versionSuccess',
                                'templates.versionFailed'
                              )
                            }
                          >
                            <GitBranch className='mr-2 h-4 w-4' />
                            {t('templates.version')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleAction(
                                () =>
                                  updateTemplate(item.id, {
                                    isPublic: !item.isPublic,
                                    engineType: item.engineType,
                                  }),
                                item.isPublic ? 'templates.shareOff' : 'templates.shareOn',
                                'templates.shareFailed'
                              )
                            }
                          >
                            <Share2 className='mr-2 h-4 w-4' />
                            {item.isPublic ? t('templates.unshare') : t('templates.share')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPreviewData({
                                id: item.id,
                                vars: '{}',
                                content: '',
                                loading: false,
                              });
                              setPreviewOpen(true);
                              void runPreview(item.id, '{}');
                            }}
                          >
                            <Eye className='mr-2 h-4 w-4' />
                            {t('common.preview')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(item)}>
                            <Download className='mr-2 h-4 w-4' />
                            {t('templates.exportBtn')}
                          </DropdownMenuItem>
                          {!item.isOfficial && <DropdownMenuSeparator />}
                          {!item.isOfficial && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={e => e.preventDefault()}
                                  className='text-red-600 focus:text-red-600 focus:bg-red-50'
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('templates.deleteTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('templates.deleteContent')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      void handleAction(
                                        () => deleteTemplate(item.id),
                                        'templates.deleted',
                                        'templates.deleteFailed'
                                      );
                                      if (selectedDetail?.id === item.id) setSelectedDetail(null);
                                    }}
                                    className='bg-red-500 hover:bg-red-600'
                                  >
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 右侧：模板详情 */}
          <div className='md:col-span-7'>
            {selectedDetail ? (
              <Card>
                <CardHeader className='border-b pb-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-xl flex items-center gap-2'>
                        {selectedDetail.name}
                        <Badge
                          variant='outline'
                          className={cn(
                            'text-[10px] font-bold border',
                            ENGINE_COLORS[selectedDetail.engineType] || ''
                          )}
                        >
                          {t(
                            TEST_TYPE_LABELS[selectedDetail.engineType as TestType] ??
                              selectedDetail.engineType
                          )}
                        </Badge>
                      </CardTitle>
                      {selectedDetail.description && (
                        <p className='text-sm text-muted-foreground mt-1'>
                          {selectedDetail.description}
                        </p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          setEditingTemplate(selectedDetail);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className='h-4 w-4 mr-1' />
                        {t('common.edit')}
                      </Button>
                      <Button size='sm' onClick={() => handleUseTemplate(selectedDetail)}>
                        {t('templates.useTemplate')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-4 space-y-4'>
                  {/* Badges & Meta */}
                  <div className='flex items-center gap-2 flex-wrap'>
                    {selectedDetail.isPublic && (
                      <Badge variant='secondary'>{t('templates.shared')}</Badge>
                    )}
                    {selectedDetail.isDefault && (
                      <Badge variant='outline'>{t('templates.default')}</Badge>
                    )}
                    {(selectedDetail.tags || []).map(tag => (
                      <Badge key={tag} variant='outline' className='text-[10px]'>
                        <Tag className='h-2.5 w-2.5 mr-0.5' />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats Row */}
                  <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Zap className='h-3 w-3' />
                      {t('templates.usageCount', { count: selectedDetail.usageCount || 0 })}
                    </span>
                    {selectedDetail.createdAt && (
                      <span className='flex items-center gap-1'>
                        <Clock className='h-3 w-3' />
                        {t('templates.createdLabel')}{' '}
                        {new Date(selectedDetail.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {selectedDetail.updatedAt && (
                      <span className='flex items-center gap-1'>
                        <Clock className='h-3 w-3' />
                        {t('templates.lastUpdated')}{' '}
                        {new Date(selectedDetail.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {Boolean(selectedDetail.config?.url) && (
                    <div>
                      <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                        URL
                      </Label>
                      <p className='mt-1 text-sm font-mono text-primary'>
                        {String(selectedDetail.config.url)}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      {t('templates.config')}
                    </Label>
                    <pre className='mt-2 p-4 rounded-md bg-muted/50 border text-xs font-mono overflow-auto max-h-[400px] whitespace-pre-wrap'>
                      {JSON.stringify(selectedDetail.config, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className='h-full flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/10 border-dashed min-h-[400px]'>
                <div className='text-center space-y-2'>
                  <div className='bg-background p-4 rounded-full inline-flex mb-2 shadow-sm'>
                    <FileCode2 className='w-8 h-8 text-muted-foreground/50' />
                  </div>
                  <h3 className='text-lg font-medium text-foreground'>{t('templates.title')}</h3>
                  <p className='text-sm'>{t('templates.noTemplatesHint')}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── 创建/编辑 Dialog ── */}
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('templates.editTitle') : t('templates.createTitle')}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('templates.descriptionOptional')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='engineType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.engineType')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {engineOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='config'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.config')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={8} className='font-mono text-xs' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex space-x-4'>
                <FormField
                  control={form.control}
                  name='isPublic'
                  render={({ field }) => (
                    <FormItem className='flex items-center space-x-2'>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>{t('templates.public')}</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='isDefault'
                  render={({ field }) => (
                    <FormItem className='flex items-center space-x-2'>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>{t('templates.default')}</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type='submit' disabled={form.formState.isSubmitting}>
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── 预览 Dialog ── */}
      <Dialog open={isPreviewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.previewTitle')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label>{t('templates.previewVars')}</Label>
              <Textarea
                className='font-mono text-xs mt-1'
                value={previewData?.vars}
                onChange={e =>
                  setPreviewData(prev => (prev ? { ...prev, vars: e.target.value } : null))
                }
              />
            </div>
            <Button
              onClick={() => previewData && runPreview(previewData.id, previewData.vars)}
              disabled={previewData?.loading}
              size='sm'
            >
              {t('templates.previewReload')}
            </Button>
            <div>
              <Label>{t('templates.previewConfig')}</Label>
              <Textarea
                className='font-mono text-xs mt-1'
                value={previewData?.content}
                readOnly
                rows={10}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
