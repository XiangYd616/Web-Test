import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Eye, GitBranch, MoreVertical, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  TEST_TYPE_LABELS,
  type TemplateItem,
  useTestConfig,
  useTestTemplates,
  useTestWorkspace,
} from '../../context/TestContext';
import { previewTemplate } from '../../services/testApi';

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

const TemplateList = () => {
  const { templates, selectedTemplateId, createTemplate, updateTemplate, deleteTemplate } =
    useTestTemplates();
  const { selectTemplate, configText, selectedType } = useTestConfig();
  const { workspaceId } = useTestWorkspace();

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateData, setPreviewTemplateData] = useState<{
    id: string;
    vars: string;
    content: string;
    loading: boolean;
  } | null>(null);

  const { t } = useTranslation();

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
  };

  const runPreview = async (templateId: string, variables: string) => {
    setPreviewTemplateData(prev =>
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
      setPreviewTemplateData(prev =>
        prev
          ? {
              ...prev,
              content: JSON.stringify(previewConfig || data, null, 2),
              loading: false,
            }
          : null
      );
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? t('templates.previewVarError')
          : (error as Error).message || t('templates.previewError')
      );
      setPreviewTemplateData(prev => (prev ? { ...prev, loading: false } : null));
    }
  };

  return (
    <TooltipProvider>
      <Card className='panel'>
        <CardHeader className='pb-3'>
          <div className='flex justify-between items-center'>
            <CardTitle className='text-sm font-semibold uppercase text-muted-foreground'>
              {t('templates.title')}
            </CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button size='sm' variant='outline' className="h-7 px-2" onClick={() => setEditingTemplate(null)}>
                  <Plus className='mr-1 h-3 w-3' /> {t('templates.add')}
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                            <Textarea {...field} rows={6} />
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
          </div>
        </CardHeader>
        
        <CardContent>
          {templates.length > 0 ? (
            <div className='flex flex-col gap-2'>
              {templates.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md transition-colors',
                    selectedTemplateId === item.id ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  <button
                    onClick={() => selectTemplate(item.id)}
                    className='flex-grow text-left truncate'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm'>{item.name}</span>
                      {item.isPublic && (
                        <Badge variant='secondary' className='text-[10px] h-4 px-1'>
                          {t('templates.shared')}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <div className='text-xs text-muted-foreground truncate max-w-[180px]'>
                        {item.description}
                      </div>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='icon' className="h-7 w-7">
                        <MoreVertical className='h-3.5 w-3.5' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                        {t('common.copy')}
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
                          setPreviewTemplateData({
                            id: item.id,
                            vars: '{}',
                            content: '',
                            loading: false,
                          });
                          setPreviewOpen(true);
                          runPreview(item.id, '{}');
                        }}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        {t('common.preview')}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
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
                              onClick={() =>
                                handleAction(
                                  () => deleteTemplate(item.id),
                                  'templates.deleted',
                                  'templates.deleteFailed'
                                )
                              }
                              className='bg-red-500 hover:bg-red-600'
                            >
                              {t('common.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-sm text-muted-foreground text-center py-4'>
              {t('common.noData')}
            </div>
          )}
        </CardContent>

        <Dialog open={isPreviewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('templates.previewTitle')}</DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label>{t('templates.previewVars')}</Label>
                <Textarea
                  value={previewTemplateData?.vars}
                  onChange={e =>
                    setPreviewTemplateData(prev =>
                      prev ? { ...prev, vars: e.target.value } : null
                    )
                  }
                />
              </div>
              <Button
                onClick={() =>
                  previewTemplateData &&
                  runPreview(previewTemplateData.id, previewTemplateData.vars)
                }
                disabled={previewTemplateData?.loading}
              >
                {t('templates.previewReload')}
              </Button>
              <div>
                <Label>{t('templates.previewConfig')}</Label>
                <Textarea value={previewTemplateData?.content} readOnly rows={8} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
};

export default TemplateList;
