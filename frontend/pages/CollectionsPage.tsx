import {
  Calendar,
  ChevronRight,
  Download,
  Edit2,
  Folder,
  GripVertical,
  Info,
  Play,
  Plus,
  PlusCircle,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import EmptyState from '../components/EmptyState';
import RequestDraftForm from '../components/collections/RequestDraftForm';
import { useTestConfig, useTestWorkspace } from '../context/TestContext';
import {
  addRequest,
  createCollection,
  deleteCollection,
  deleteRequest,
  getCollection,
  listCollections,
  setDefaultEnvironment,
  updateCollection,
  updateRequest,
  type CollectionDetail,
  type CollectionItem,
} from '../services/collectionApi';
import { listEnvironments, type EnvironmentItem } from '../services/environmentApi';
import {
  autoDetectAndImportCollection,
  downloadFile,
  exportToNativeCollection,
  exportToPostmanCollection,
  readFileAsText,
} from '../services/importExportService';
import { isDesktop } from '../utils/environment';

const CollectionsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useTestWorkspace();
  const { updateUrl, updateConfigText, selectTestType } = useTestConfig();

  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selected, setSelected] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Edit collection state
  const [editingCollection, setEditingCollection] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Add/Edit request drafts (support multi-form)
  const [requestDrafts, setRequestDrafts] = useState<
    Array<{
      id: string;
      mode: 'new' | 'edit';
      sourceId?: string;
      name: string;
      method: string;
      url: string;
      headers: string;
      body: string;
    }>
  >([]);
  const [lastAddedDraftId, setLastAddedDraftId] = useState<string | null>(null);
  const draftRefs = useRef(new Map<string, HTMLDivElement | null>());
  const draftUrlRefs = useRef(new Map<string, HTMLInputElement | null>());

  // Environment list for default environment selector
  const [envList, setEnvList] = useState<EnvironmentItem[]>([]);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await listCollections({ workspaceId });
      setCollections(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!workspaceId) return;
    let ignore = false;
    void listEnvironments(workspaceId).then(list => {
      if (!ignore) setEnvList(Array.isArray(list) ? list : []);
    });
    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  const handleSelect = async (id: string) => {
    try {
      const detail = await getCollection(id);
      setSelected(detail);
      setRequestDrafts([]);
      setLastAddedDraftId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    if (!lastAddedDraftId) return;
    const draftId = lastAddedDraftId;
    const node = draftRefs.current.get(draftId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const input = draftUrlRefs.current.get(draftId);
    if (input) {
      input.focus();
      input.select();
    }
    setLastAddedDraftId(null);
  }, [lastAddedDraftId, requestDrafts.length]);

  const handleCreate = async () => {
    if (!workspaceId || !newName.trim()) return;
    try {
      await createCollection({
        name: newName.trim(),
        description: newDesc.trim(),
        workspaceId,
      });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await refresh();
      toast.success(t('collections.created', 'Collection created'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCollection(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelected(null);
      await refresh();
      toast.success(t('collections.deleted', 'Collection deleted'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const startEditCollection = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDesc(selected.description || '');
    setEditingCollection(true);
  };

  const handleSaveCollection = async () => {
    if (!selected) return;
    try {
      const updated = await updateCollection(selected.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      if (updated) setSelected(updated);
      setEditingCollection(false);
      await refresh();
      toast.success(t('collections.updated', 'Collection updated'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const detail = await getCollection(selected.id);
    if (detail) setSelected(detail);
  };

  const handleSetDefaultEnv = async (envId: string) => {
    if (!selected) return;
    try {
      const updated = await setDefaultEnvironment(selected.id, envId === '__none__' ? null : envId);
      if (updated) setSelected(updated);
      await refresh();
      toast.success(t('collections.defaultEnvUpdated', 'Default environment updated'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createEmptyDraft = () => ({
    id: createDraftId(),
    mode: 'new' as const,
    name: '',
    method: 'GET',
    url: '',
    headers: '',
    body: '',
  });
  const addDraft = () => {
    const nextDraft = createEmptyDraft();
    setRequestDrafts(prev => [...prev, nextDraft]);
    setLastAddedDraftId(nextDraft.id);
  };
  const updateDraft = (id: string, patch: Partial<(typeof requestDrafts)[number]>) => {
    setRequestDrafts(prev => prev.map(draft => (draft.id === id ? { ...draft, ...patch } : draft)));
  };
  const removeDraft = (id: string) => {
    setRequestDrafts(prev => prev.filter(draft => draft.id !== id));
  };

  const startEditRequest = (req: Record<string, unknown>) => {
    const sourceId = String(req.id || '');
    if (!sourceId) return;
    const nextDraft = {
      id: createDraftId(),
      mode: 'edit' as const,
      sourceId,
      name: String(req.name || ''),
      method: String(req.method || 'GET'),
      url:
        typeof req.url === 'string'
          ? req.url
          : String((req.url as Record<string, unknown>)?.raw || ''),
      headers: (() => {
        const hdrs = req.headers as Record<string, string> | undefined;
        return hdrs ? JSON.stringify(hdrs, null, 2) : '';
      })(),
      body:
        typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body, null, 2) : '',
    };
    setRequestDrafts(prev => {
      const exists = prev.some(draft => draft.sourceId === sourceId);
      if (exists) return prev;
      return [...prev, nextDraft];
    });
    setLastAddedDraftId(nextDraft.id);
  };

  const handleSaveDraft = async (draftId: string) => {
    if (!selected) return;
    const draft = requestDrafts.find(item => item.id === draftId);
    if (!draft || !draft.url.trim()) return;
    const editingId = draft.sourceId ? String(draft.sourceId) : null;
    const canUpdate =
      draft.mode === 'edit' &&
      Boolean(editingId) &&
      (selected.requests || []).some(req => String(req.id || '') === String(editingId));
    let parsedHeaders: Record<string, string> = {};
    if (draft.headers.trim()) {
      try {
        parsedHeaders = JSON.parse(draft.headers);
      } catch {
        /* ignore */
      }
    }
    let parsedBody: unknown = draft.body.trim() || null;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody as string);
      } catch {
        /* keep as string */
      }
    }
    const payload: Record<string, unknown> = {
      name: draft.name.trim() || draft.url.trim(),
      method: draft.method,
      url: draft.url.trim(),
      headers: parsedHeaders,
      body: parsedBody,
    };
    try {
      if (canUpdate) {
        await updateRequest(selected.id, String(editingId), payload);
        toast.success(t('collections.reqUpdated', 'Request updated'));
      } else {
        await addRequest(selected.id, payload);
        toast.success(t('collections.reqAdded', 'Request added'));
      }
      if (draft.mode === 'new') {
        updateDraft(draft.id, { name: '', method: 'GET', url: '', headers: '', body: '' });
      } else {
        updateDraft(draft.id, { ...draft, ...payload, url: String(payload.url || '') });
      }
      await refreshSelected();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDeleteRequest = async (reqId: string) => {
    if (!selected) return;
    try {
      await deleteRequest(selected.id, reqId);
      toast.success(t('collections.reqDeleted', 'Request deleted'));
      await refreshSelected();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const buildEndpoints = useCallback(
    (requests: Array<Record<string, unknown>>) =>
      requests.map(req => ({
        name: String(req.name || ''),
        url:
          typeof req.url === 'string'
            ? req.url
            : String((req.url as Record<string, unknown>)?.raw || ''),
        method: String(req.method || 'GET'),
        headers: (req.headers || {}) as Record<string, string>,
        body: req.body ?? null,
        assertions: Array.isArray(req.assertions) ? req.assertions : [],
      })),
    []
  );

  // Run confirmation dialog state
  const [showRunConfirm, setShowRunConfirm] = useState<'all' | 'single' | null>(null);
  const pendingRunRef = useRef<{
    endpoints: ReturnType<typeof buildEndpoints>;
    firstUrl: string;
  } | null>(null);

  const handleRunCollection = useCallback(() => {
    if (!selected?.requests?.length) return;
    const endpoints = buildEndpoints(selected.requests);
    const firstUrl = endpoints[0]?.url || 'https://example.com';
    pendingRunRef.current = { endpoints, firstUrl };
    setShowRunConfirm('all');
  }, [selected, buildEndpoints]);

  const handleRunSingleRequest = useCallback(
    (req: Record<string, unknown>) => {
      const endpoints = buildEndpoints([req]);
      const url = endpoints[0]?.url || 'https://example.com';
      pendingRunRef.current = { endpoints, firstUrl: url };
      setShowRunConfirm('single');
    },
    [buildEndpoints]
  );

  const confirmRun = useCallback(() => {
    const pending = pendingRunRef.current;
    if (!pending) return;
    selectTestType('api');
    updateUrl(pending.firstUrl);
    updateConfigText(
      JSON.stringify(
        { testType: 'api', url: pending.firstUrl, endpoints: pending.endpoints },
        null,
        2
      )
    );
    setShowRunConfirm(null);
    pendingRunRef.current = null;
    navigate('/dashboard');
    // 延迟一帧触发测试运行（等待 navigate 和状态更新完成）
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('tw:focus-url-and-run'));
    });
  }, [selectTestType, updateUrl, updateConfigText, navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const { format, collection } = autoDetectAndImportCollection(text);
      const created = await createCollection({
        name: collection.name,
        description: collection.description,
        workspaceId: workspaceId || undefined,
        requests: collection.requests,
        variables: collection.variables,
        auth: collection.auth,
        folders: collection.folders,
      });
      await refresh();
      if (created?.id) {
        const detail = await getCollection(created.id);
        setSelected(detail);
      }
      toast.success(t('collections.importSuccess', `已从 ${format} 格式导入: ${collection.name}`));
    } catch (e) {
      toast.error((e as Error).message || t('collections.importFailed', '导入失败'));
    }
  };

  const handleExportPostman = () => {
    if (!selected) return;
    const json = exportToPostmanCollection(selected);
    downloadFile(json, `${selected.name}.postman_collection.json`);
    toast.success(t('collections.exported', '已导出为 Postman Collection'));
  };

  const handleExportNative = () => {
    if (!selected) return;
    const json = exportToNativeCollection(selected);
    downloadFile(json, `${selected.name}.testweb.json`);
    toast.success(t('collections.exported', '已导出为 Test-Web JSON'));
  };

  const filteredCollections = useMemo(
    () =>
      searchQuery
        ? collections.filter(
            c =>
              c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (c.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : collections,
    [collections, searchQuery]
  );

  const requestCount = selected?.requests?.length ?? 0;

  const methodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'POST':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      case 'PUT':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      case 'PATCH':
        return 'text-purple-600 bg-purple-500/10 border-purple-500/20';
      case 'DELETE':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      default:
        return 'text-muted-foreground bg-muted/50';
    }
  };

  return (
    <div className='container py-6 space-y-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('collections.title', 'Collections')}
        </h2>
        <div className='flex items-center gap-2'>
          <input
            ref={importFileRef}
            type='file'
            accept='.json,.har'
            className='hidden'
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
          <Button variant='outline' size='sm' onClick={() => importFileRef.current?.click()}>
            <Upload className='h-4 w-4 mr-1' />
            {t('collections.import', '导入')}
          </Button>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? 'secondary' : 'default'}
            size='sm'
          >
            <Plus className='h-4 w-4 mr-1' />
            {showCreate ? t('common.cancel') : t('collections.createTitle', 'New Collection')}
          </Button>
        </div>
      </div>

      {/* Feature description banner */}
      <div className='flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border text-sm text-muted-foreground'>
        <Info className='h-4 w-4 flex-shrink-0' />
        <span>
          {t(
            'collections.featureDesc',
            'API 测试集合 — 用于组织 RESTful 请求与批量执行。可导入 Postman / Swagger / HAR，也可创建定时任务自动运行。'
          )}
        </span>
      </div>

      {showCreate && (
        <Card className='animate-in fade-in slide-in-from-top-4 duration-200'>
          <CardHeader>
            <CardTitle className='text-base'>
              {t('collections.createTitle', 'Create Collection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex gap-4 items-end'>
              <div className='space-y-2 flex-1'>
                <Label>{t('collections.namePlaceholder', 'Name')}</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder='e.g. Auth API'
                />
              </div>
              <div className='space-y-2 flex-[2]'>
                <Label>{t('collections.descPlaceholder', 'Description')}</Label>
                <Input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder='Optional description'
                />
              </div>
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className='grid grid-cols-1 md:grid-cols-12 gap-6 items-start'>
        {/* Collection List */}
        <div className='md:col-span-4 space-y-4'>
          <Card className='h-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-medium text-muted-foreground uppercase tracking-wider'>
                {t('collections.listTitle', 'Collection List')}
              </CardTitle>
            </CardHeader>
            <div className='px-3 pb-2'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder={t('collections.searchPlaceholder', 'Search collections...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='h-8 pl-7 text-xs'
                />
              </div>
            </div>
            <CardContent className='p-2'>
              {loading && collections.length === 0 ? (
                <div className='p-4 text-center text-muted-foreground'>{t('common.loading')}</div>
              ) : filteredCollections.length === 0 ? (
                <EmptyState
                  icon={Folder}
                  title={
                    searchQuery ? t('common.noData') : t('collections.empty', 'No collections')
                  }
                  compact
                />
              ) : (
                <div className='space-y-1'>
                  {filteredCollections.map(col => (
                    <div
                      key={col.id}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border border-transparent',
                        selected?.id === col.id
                          ? 'bg-accent border-border shadow-sm'
                          : 'hover:bg-muted/50'
                      )}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleSelect(col.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelect(col.id);
                      }}
                    >
                      <div className='flex items-center gap-3 overflow-hidden'>
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150',
                            selected?.id === col.id && 'rotate-90 text-primary'
                          )}
                        />
                        <div className='bg-primary/10 p-1.5 rounded-md'>
                          <Folder className='h-3.5 w-3.5 text-primary' />
                        </div>
                        <div className='flex flex-col overflow-hidden'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-sm truncate'>{col.name}</span>
                            {(col.requestCount ?? 0) > 0 && (
                              <Badge
                                variant='secondary'
                                className='text-[10px] px-1.5 py-0 h-4 flex-shrink-0'
                              >
                                {col.requestCount}
                              </Badge>
                            )}
                          </div>
                          {col.description && (
                            <span className='text-xs text-muted-foreground truncate'>
                              {col.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity'
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget({ id: col.id, name: col.name });
                        }}
                        title={t('common.delete')}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Detail */}
        <div className='md:col-span-8'>
          {selected ? (
            <Card>
              <CardHeader className='border-b pb-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1 min-w-0'>
                    {editingCollection ? (
                      <div className='space-y-2'>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className='text-xl font-semibold'
                          placeholder={t('collections.namePlaceholder', 'Name')}
                        />
                        <Input
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className='text-sm'
                          placeholder={t('collections.descPlaceholder', 'Description')}
                        />
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            onClick={() => void handleSaveCollection()}
                            disabled={!editName.trim()}
                          >
                            <Save className='h-3.5 w-3.5 mr-1' />
                            {t('common.save')}
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => setEditingCollection(false)}
                          >
                            <X className='h-3.5 w-3.5 mr-1' />
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <CardTitle className='text-xl flex items-center gap-2'>
                          {selected.name}
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-muted-foreground hover:text-foreground'
                            onClick={startEditCollection}
                          >
                            <Edit2 className='h-3.5 w-3.5' />
                          </Button>
                        </CardTitle>
                        {selected.description && (
                          <p className='text-sm text-muted-foreground mt-1'>
                            {selected.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {!editingCollection && (
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size='sm' variant='outline'>
                            <Download className='h-4 w-4 mr-1' />
                            {t('collections.export', '导出')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={handleExportPostman}>
                            Postman Collection v2.1
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportNative}>
                            Test-Web JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {requestCount > 0 && (
                        <>
                          {isDesktop() && (
                            <>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  navigate(
                                    `/schedules?collectionId=${selected.id}&collectionName=${encodeURIComponent(selected.name)}`
                                  )
                                }
                              >
                                <Calendar className='h-4 w-4 mr-1' />
                                {t('collections.createSchedule', '定时运行')}
                              </Button>
                              <Button size='sm' onClick={handleRunCollection}>
                                <Play className='h-4 w-4 mr-1' />
                                {t('collections.runAll', '运行全部')}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className='pt-6 space-y-6'>
                {/* Stats */}
                <div className='flex items-center gap-4'>
                  <div className='p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex-1'>
                    <div className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      {t('collections.requests', 'Requests')}
                    </div>
                    <div className='text-2xl font-bold mt-1'>{requestCount}</div>
                  </div>
                </div>

                {/* Default Environment */}
                {envList.length > 0 && (
                  <div className='flex items-center gap-3'>
                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap'>
                      {t('collections.defaultEnv', 'Default Environment')}
                    </Label>
                    <Select
                      value={selected.defaultEnvironmentId || '__none__'}
                      onValueChange={v => void handleSetDefaultEnv(v)}
                    >
                      <SelectTrigger className='h-8 w-[220px]'>
                        <SelectValue placeholder={t('collections.noDefaultEnv', 'None')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__none__'>
                          {t('collections.noDefaultEnv', 'None')}
                        </SelectItem>
                        {envList.map(env => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Request List */}
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                      {t('collections.requestList', 'Request List')}
                    </h4>
                    <Button size='sm' variant='outline' onClick={addDraft}>
                      <PlusCircle className='h-3.5 w-3.5 mr-1' />
                      {t('collections.addRequest', 'Add Request')}
                    </Button>
                  </div>

                  {/* New Request Drafts */}
                  {requestDrafts
                    .filter(draft => draft.mode === 'new')
                    .map(draft => (
                      <Card
                        key={draft.id}
                        ref={node => {
                          draftRefs.current.set(draft.id, node);
                        }}
                        className='mb-4 border-dashed animate-in fade-in slide-in-from-top-2 duration-200'
                      >
                        <CardContent className='pt-4'>
                          <RequestDraftForm
                            draft={draft}
                            onUpdate={updateDraft}
                            onSave={id => void handleSaveDraft(id)}
                            onCancel={removeDraft}
                            urlRef={input => {
                              draftUrlRefs.current.set(draft.id, input);
                            }}
                          />
                        </CardContent>
                      </Card>
                    ))}

                  {requestCount > 0 ? (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='w-[40px]'></TableHead>
                            <TableHead>{t('collections.reqName', 'Name')}</TableHead>
                            <TableHead className='w-[100px]'>
                              {t('collections.reqMethod', 'Method')}
                            </TableHead>
                            <TableHead>{t('collections.reqUrl', 'URL')}</TableHead>
                            <TableHead className='w-[110px] text-right'>
                              {t('common.actions')}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selected.requests || []).map((req, idx) => {
                            const reqId = String(req.id || idx);
                            const editDraft = requestDrafts.find(
                              draft => draft.mode === 'edit' && draft.sourceId === reqId
                            );
                            return (
                              <Fragment key={reqId}>
                                <TableRow>
                                  <TableCell className='text-muted-foreground'>
                                    <GripVertical className='h-3.5 w-3.5' />
                                  </TableCell>
                                  <TableCell className='font-medium'>
                                    {String(req.name || '—')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant='outline'
                                      className={cn(
                                        'font-mono text-[10px] font-bold border',
                                        methodColor(String(req.method || 'GET'))
                                      )}
                                    >
                                      {String(req.method || 'GET')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className='font-mono text-xs text-muted-foreground truncate max-w-[250px]'>
                                    {typeof req.url === 'string'
                                      ? req.url
                                      : String((req.url as Record<string, unknown>)?.raw || '—')}
                                  </TableCell>
                                  <TableCell className='text-right'>
                                    <div className='flex items-center justify-end gap-1'>
                                      {isDesktop() && (
                                        <Button
                                          size='icon'
                                          variant='ghost'
                                          className='h-7 w-7 text-green-600 hover:text-green-700'
                                          onClick={() => handleRunSingleRequest(req)}
                                          title={t('collections.runSingle', 'Run')}
                                        >
                                          <Play className='h-3.5 w-3.5' />
                                        </Button>
                                      )}
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        className='h-7 w-7'
                                        onClick={() => startEditRequest(req)}
                                      >
                                        <Edit2 className='h-3.5 w-3.5' />
                                      </Button>
                                      {String(req.id || '') && (
                                        <Button
                                          size='icon'
                                          variant='ghost'
                                          className='h-7 w-7 text-muted-foreground hover:text-red-600'
                                          onClick={() => void handleDeleteRequest(String(req.id))}
                                        >
                                          <Trash2 className='h-3.5 w-3.5' />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {editDraft && (
                                  <TableRow>
                                    <TableCell colSpan={5}>
                                      <div
                                        ref={node => {
                                          draftRefs.current.set(editDraft.id, node);
                                        }}
                                        className='border border-dashed rounded-md p-4 bg-muted/30'
                                      >
                                        <RequestDraftForm
                                          draft={editDraft}
                                          onUpdate={updateDraft}
                                          onSave={(id: string) => void handleSaveDraft(id)}
                                          onCancel={removeDraft}
                                          urlRef={(input: HTMLInputElement | null) => {
                                            draftUrlRefs.current.set(editDraft.id, input);
                                          }}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground border rounded-md border-dashed'>
                      <p className='text-sm'>{t('collections.noRequests', 'No requests yet')}</p>
                      <Button size='sm' variant='outline' className='mt-3' onClick={addDraft}>
                        <PlusCircle className='h-3.5 w-3.5 mr-1' />
                        {t('collections.addFirst', 'Add your first request')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='h-full flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/10 border-dashed min-h-[400px]'>
              <div className='text-center space-y-3'>
                <div className='bg-background p-4 rounded-full inline-flex mb-2 shadow-sm'>
                  <Folder className='w-8 h-8 text-muted-foreground/50' />
                </div>
                <h3 className='text-lg font-medium text-foreground'>
                  {t('collections.selectHintTitle', 'No Collection Selected')}
                </h3>
                <p className='text-sm'>
                  {t(
                    'collections.selectHint',
                    'Select a collection from the list to view details.'
                  )}
                </p>
                <div className='flex items-center justify-center gap-2 pt-2'>
                  <Button size='sm' onClick={() => setShowCreate(true)}>
                    <Plus className='h-3.5 w-3.5 mr-1' />
                    {t('collections.createTitle', 'New Collection')}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Upload className='h-3.5 w-3.5 mr-1' />
                    {t('collections.import', '导入')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('collections.deleteTitle', 'Delete collection?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'collections.deleteContent',
                'This will permanently delete "{{name}}" and all its requests. This action cannot be undone.',
                { name: deleteTarget?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run Confirmation Dialog */}
      <AlertDialog
        open={!!showRunConfirm}
        onOpenChange={open => {
          if (!open) {
            setShowRunConfirm(null);
            pendingRunRef.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showRunConfirm === 'all'
                ? t('collections.runConfirmTitle', '运行集合')
                : t('collections.runSingleConfirmTitle', '运行请求')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {showRunConfirm === 'all'
                ? t(
                    'collections.runConfirmDesc',
                    `即将跳转到控制台，以 API 测试模式运行 ${pendingRunRef.current?.endpoints.length ?? 0} 个请求。`
                  )
                : t(
                    'collections.runSingleConfirmDesc',
                    `即将跳转到控制台，运行请求: ${pendingRunRef.current?.endpoints[0]?.name || pendingRunRef.current?.firstUrl || ''}`
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRun}>
              <Play className='h-4 w-4 mr-1' />
              {t('collections.confirmRun', '跳转并开始测试')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollectionsPage;
