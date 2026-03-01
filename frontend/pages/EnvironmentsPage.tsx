import {
  Check,
  Download,
  Edit2,
  Lock,
  Plus,
  Save,
  Search,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Switch } from '@/components/ui/switch';
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
import { useTestWorkspace } from '../context/TestContext';
import {
  activateEnvironment,
  createEnvironment,
  deleteEnvironment,
  deleteVariable,
  getEnvironment,
  listEnvironments,
  setVariable,
  updateEnvironment,
  type EnvironmentDetail,
  type EnvironmentItem,
  type EnvironmentVariable,
} from '../services/environmentApi';
import {
  autoDetectAndImportEnvironment,
  downloadFile,
  exportToNativeEnvironment,
  exportToPostmanEnvironment,
  readFileAsText,
} from '../services/importExportService';

const EnvironmentsPage = () => {
  const { t } = useTranslation();
  const { workspaceId } = useTestWorkspace();

  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [selected, setSelected] = useState<EnvironmentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // New environment form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Edit environment state
  const [editingEnv, setEditingEnv] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    isActive?: boolean;
  } | null>(null);
  const [deleteVarTarget, setDeleteVarTarget] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [varSearch, setVarSearch] = useState('');

  // New variable form
  const [varKey, setVarKey] = useState('');
  const [varValue, setVarValue] = useState('');
  const [varSecret, setVarSecret] = useState(false);

  // Edit variable state
  const [editingVarKey, setEditingVarKey] = useState<string | null>(null);
  const [editVarValue, setEditVarValue] = useState('');
  const [editVarSecret, setEditVarSecret] = useState(false);

  const filteredEnvironments = environments.filter(
    env =>
      !searchQuery.trim() ||
      env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (env.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVariables = (selected?.variables || []).filter(
    v =>
      !varSearch.trim() ||
      v.key.toLowerCase().includes(varSearch.toLowerCase()) ||
      v.value.toLowerCase().includes(varSearch.toLowerCase())
  );

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await listEnvironments(workspaceId);
      setEnvironments(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSelect = async (id: string) => {
    try {
      const detail = await getEnvironment(id);
      setSelected(detail);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!workspaceId || !newName.trim()) return;
    try {
      const created = await createEnvironment({
        workspaceId,
        name: newName.trim(),
        description: newDesc.trim(),
      });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await refresh();
      if (created?.id) {
        const detail = await getEnvironment(created.id);
        setSelected(detail);
      }
      toast.success(t('environments.created', 'Environment created'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isActive) {
      toast.error(t('environments.cannotDeleteActive', '无法删除当前激活的环境，请先激活其他环境'));
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteEnvironment(deleteTarget.id);
      if (selected?.id === deleteTarget.id) setSelected(null);
      await refresh();
      toast.success(t('environments.deleted', 'Environment deleted'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const startEditEnv = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDesc(selected.description || '');
    setEditingEnv(true);
  };

  const handleSaveEnv = async () => {
    if (!selected) return;
    try {
      const updated = await updateEnvironment(selected.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      if (updated) setSelected(updated);
      setEditingEnv(false);
      await refresh();
      toast.success(t('environments.updated', 'Environment updated'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startEditVar = (v: EnvironmentVariable) => {
    setEditingVarKey(v.key);
    setEditVarValue(v.value);
    setEditVarSecret(v.secret || false);
  };

  const handleSaveVar = async () => {
    if (!selected || !editingVarKey) return;
    try {
      await setVariable(selected.id, {
        key: editingVarKey,
        value: editVarValue,
        secret: editVarSecret,
      });
      setEditingVarKey(null);
      const detail = await getEnvironment(selected.id);
      setSelected(detail);
      await refresh();
      toast.success(t('environments.variableUpdated', 'Variable updated'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDeleteVar = async () => {
    if (!selected || !deleteVarTarget) return;
    try {
      await deleteVariable(selected.id, deleteVarTarget);
      const detail = await getEnvironment(selected.id);
      setSelected(detail);
      await refresh();
      toast.success(t('environments.variableDeleted', 'Variable deleted'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteVarTarget(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateEnvironment(id);
      await refresh();
      toast.success(t('environments.activated', 'Environment activated'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportEnv = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const { format, environment } = autoDetectAndImportEnvironment(text);
      if (!workspaceId) return;
      await createEnvironment({
        workspaceId,
        name: environment.name,
        description: environment.description,
        variables: (environment.variables || []).map(v => ({
          key: v.key,
          value: v.value,
          type: v.type,
          secret: v.secret,
        })),
      });
      await refresh();
      toast.success(
        t('environments.importSuccess', `已从 ${format} 格式导入: ${environment.name}`)
      );
    } catch (e) {
      toast.error((e as Error).message || t('environments.importFailed', '导入失败'));
    }
  };

  const handleExportPostmanEnv = () => {
    if (!selected) return;
    const json = exportToPostmanEnvironment(selected);
    downloadFile(json, `${selected.name}.postman_environment.json`);
    toast.success(t('environments.exported', '已导出为 Postman Environment'));
  };

  const handleExportNativeEnv = () => {
    if (!selected) return;
    const json = exportToNativeEnvironment(selected);
    downloadFile(json, `${selected.name}.testweb_env.json`);
    toast.success(t('environments.exported', '已导出为 Test-Web JSON'));
  };

  const handleAddVariable = async () => {
    if (!selected || !varKey.trim()) return;
    try {
      await setVariable(selected.id, {
        key: varKey.trim(),
        value: varValue,
        secret: varSecret,
      });
      setVarKey('');
      setVarValue('');
      setVarSecret(false);
      const detail = await getEnvironment(selected.id);
      setSelected(detail);
      await refresh();
      toast.success(t('environments.variableAdded', 'Variable added'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className='container py-6 space-y-6 max-w-7xl mx-auto'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold tracking-tight'>
          {t('environments.title', 'Environments')}
        </h2>
        <div className='flex items-center gap-2'>
          <input
            ref={importFileRef}
            type='file'
            accept='.json'
            className='hidden'
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleImportEnv(file);
              e.target.value = '';
            }}
          />
          <Button variant='outline' size='sm' onClick={() => importFileRef.current?.click()}>
            <Upload className='h-4 w-4 mr-1' />
            {t('environments.import', '导入')}
          </Button>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? 'secondary' : 'default'}
            size='sm'
          >
            <Plus className='h-4 w-4 mr-1' />
            {showCreate ? t('common.cancel') : t('common.add')}
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className='animate-in fade-in slide-in-from-top-4 duration-200'>
          <CardHeader>
            <CardTitle className='text-base'>
              {t('environments.createTitle', 'Create Environment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex gap-4 items-end'>
              <div className='space-y-2 flex-1'>
                <Label>{t('environments.namePlaceholder', 'Name')}</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder='e.g. Production'
                />
              </div>
              <div className='space-y-2 flex-[2]'>
                <Label>{t('environments.descPlaceholder', 'Description')}</Label>
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
        {/* Environment List */}
        <div className='md:col-span-4 space-y-4'>
          <Card className='h-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-medium text-muted-foreground uppercase tracking-wider'>
                {t('environments.listTitle', 'Environment List')}
              </CardTitle>
              <div className='relative mt-2'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  className='h-8 pl-8 text-sm'
                  placeholder={t('environments.searchPlaceholder', 'Search environments...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className='p-2'>
              {loading && environments.length === 0 ? (
                <div className='p-4 text-center text-muted-foreground'>{t('common.loading')}</div>
              ) : filteredEnvironments.length === 0 ? (
                <EmptyState
                  icon={Lock}
                  title={
                    searchQuery ? t('common.noData') : t('environments.empty', 'No environments')
                  }
                  compact
                />
              ) : (
                <div className='space-y-1'>
                  {filteredEnvironments.map(env => (
                    <button
                      type='button'
                      key={env.id}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border border-transparent w-full text-left',
                        selected?.id === env.id
                          ? 'bg-accent border-border shadow-sm'
                          : 'hover:bg-muted/50',
                        env.isActive && 'bg-green-50/50 hover:bg-green-50/80 dark:bg-green-950/10'
                      )}
                      onClick={() => handleSelect(env.id)}
                    >
                      <div className='flex items-center gap-3 overflow-hidden'>
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            env.isActive ? 'bg-green-500' : 'bg-muted-foreground/30'
                          )}
                        />
                        <div className='flex flex-col overflow-hidden'>
                          <span className='font-medium truncate'>{env.name}</span>
                          <span className='text-xs text-muted-foreground'>
                            {env.variableCount || 0} {t('environments.vars', 'vars')}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1'>
                        {!env.isActive && (
                          <div
                            role='button'
                            tabIndex={0}
                            className='inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-green-600 hover:bg-accent'
                            onClick={e => {
                              e.stopPropagation();
                              void handleActivate(env.id);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                void handleActivate(env.id);
                              }
                            }}
                            title={t('environments.activate')}
                          >
                            <Check className='h-4 w-4' />
                          </div>
                        )}
                        <div
                          role='button'
                          tabIndex={0}
                          className='inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-red-600 hover:bg-accent'
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteTarget({ id: env.id, name: env.name, isActive: env.isActive });
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              setDeleteTarget({
                                id: env.id,
                                name: env.name,
                                isActive: env.isActive,
                              });
                            }
                          }}
                          title={t('common.delete')}
                        >
                          <Trash2 className='h-4 w-4' />
                        </div>
                      </div>
                    </button>
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
                    {editingEnv ? (
                      <div className='space-y-2'>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className='text-xl font-semibold'
                          placeholder={t('environments.namePlaceholder', 'Name')}
                        />
                        <Input
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className='text-sm'
                          placeholder={t('environments.descPlaceholder', 'Description')}
                        />
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            onClick={() => void handleSaveEnv()}
                            disabled={!editName.trim()}
                          >
                            <Save className='h-3.5 w-3.5 mr-1' />
                            {t('common.save')}
                          </Button>
                          <Button size='sm' variant='ghost' onClick={() => setEditingEnv(false)}>
                            <X className='h-3.5 w-3.5 mr-1' />
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <CardTitle className='text-xl flex items-center gap-2'>
                          {selected.name}
                          {selected.isActive && (
                            <Badge
                              variant='secondary'
                              className='text-green-600 bg-green-50 border-green-200'
                            >
                              {t('environments.active')}
                            </Badge>
                          )}
                          <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7 text-muted-foreground hover:text-foreground'
                            onClick={startEditEnv}
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
                  {!editingEnv && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size='sm' variant='outline'>
                          <Download className='h-4 w-4 mr-1' />
                          {t('environments.export', '导出')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={handleExportPostmanEnv}>
                          Postman Environment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportNativeEnv}>
                          Test-Web JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className='pt-6 space-y-6'>
                {/* Add Variable Form */}
                <div className='bg-muted/30 p-4 rounded-lg border space-y-4'>
                  <h4 className='text-sm font-medium text-muted-foreground uppercase tracking-wider'>
                    {t('environments.addVar', 'Add Variable')}
                  </h4>
                  <div className='grid grid-cols-12 gap-3 items-end'>
                    <div className='col-span-4 space-y-1.5'>
                      <Label className='text-xs'>{t('environments.key', 'Key')}</Label>
                      <Input
                        value={varKey}
                        onChange={e => setVarKey(e.target.value)}
                        placeholder='API_KEY'
                        className='h-8 bg-background'
                      />
                    </div>
                    <div className='col-span-5 space-y-1.5'>
                      <Label className='text-xs'>{t('environments.value', 'Value')}</Label>
                      <Input
                        value={varValue}
                        onChange={e => setVarValue(e.target.value)}
                        placeholder='Value'
                        className='h-8 bg-background'
                        type={varSecret ? 'password' : 'text'}
                      />
                    </div>
                    <div className='col-span-2 flex items-center h-8'>
                      <div className='flex items-center gap-2'>
                        <Switch
                          checked={varSecret}
                          onCheckedChange={setVarSecret}
                          id='secret-mode'
                          className='h-5 w-9'
                        />
                        <Label htmlFor='secret-mode' className='cursor-pointer text-xs'>
                          {varSecret ? (
                            <Lock className='h-3 w-3' />
                          ) : (
                            <Unlock className='h-3 w-3' />
                          )}
                        </Label>
                      </div>
                    </div>
                    <div className='col-span-1'>
                      <Button
                        size='sm'
                        className='w-full h-8'
                        onClick={handleAddVariable}
                        disabled={!varKey.trim()}
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Variable Search */}
                {(selected.variables || []).length > 5 && (
                  <div className='relative'>
                    <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      className='h-8 pl-8 text-sm'
                      placeholder={t('environments.searchVars', 'Search variables...')}
                      value={varSearch}
                      onChange={e => setVarSearch(e.target.value)}
                    />
                  </div>
                )}

                {/* Variables Table */}
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[25%]'>{t('environments.key')}</TableHead>
                        <TableHead className='w-[35%]'>{t('environments.value')}</TableHead>
                        <TableHead className='w-[10%]'>{t('environments.type')}</TableHead>
                        <TableHead className='w-[10%] text-right'>
                          {t('environments.secret')}
                        </TableHead>
                        <TableHead className='w-[20%] text-right'>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVariables.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                            {t('environments.noVars', 'No variables configured')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVariables.map((v: EnvironmentVariable) => (
                          <TableRow key={v.key}>
                            <TableCell className='font-mono font-medium'>{v.key}</TableCell>
                            <TableCell className='font-mono text-muted-foreground break-all'>
                              {editingVarKey === v.key ? (
                                <div className='flex items-center gap-2'>
                                  <Input
                                    value={editVarValue}
                                    onChange={e => setEditVarValue(e.target.value)}
                                    className='h-7 text-xs font-mono'
                                    type={editVarSecret ? 'password' : 'text'}
                                  />
                                  <div className='flex items-center gap-1'>
                                    <Switch
                                      checked={editVarSecret}
                                      onCheckedChange={setEditVarSecret}
                                      className='h-4 w-7'
                                    />
                                  </div>
                                </div>
                              ) : v.encrypted ? (
                                '••••••••'
                              ) : (
                                v.value
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline' className='font-normal'>
                                {v.type || 'text'}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                              {v.secret ? (
                                <Lock className='h-4 w-4 text-muted-foreground ml-auto' />
                              ) : (
                                <Unlock className='h-4 w-4 text-muted-foreground/30 ml-auto' />
                              )}
                            </TableCell>
                            <TableCell className='text-right'>
                              {editingVarKey === v.key ? (
                                <div className='flex items-center justify-end gap-1'>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-7 w-7 text-green-600'
                                    onClick={() => void handleSaveVar()}
                                  >
                                    <Save className='h-3.5 w-3.5' />
                                  </Button>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-7 w-7'
                                    onClick={() => setEditingVarKey(null)}
                                  >
                                    <X className='h-3.5 w-3.5' />
                                  </Button>
                                </div>
                              ) : (
                                <div className='flex items-center justify-end gap-1'>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                    onClick={() => startEditVar(v)}
                                    title={t('common.edit')}
                                  >
                                    <Edit2 className='h-3.5 w-3.5' />
                                  </Button>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    className='h-7 w-7 text-muted-foreground hover:text-red-600'
                                    onClick={() => setDeleteVarTarget(v.key)}
                                    title={t('common.delete')}
                                  >
                                    <Trash2 className='h-3.5 w-3.5' />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='h-full flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/10 border-dashed min-h-[400px]'>
              <div className='text-center space-y-3'>
                <div className='bg-background p-4 rounded-full inline-flex mb-2 shadow-sm'>
                  <svg
                    className='w-8 h-8 text-muted-foreground/50'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={1.5}
                      d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-medium text-foreground'>
                  {t('environments.selectHintTitle', 'No Environment Selected')}
                </h3>
                <p className='text-sm'>
                  {t(
                    'environments.selectHint',
                    'Select an environment from the list to view and manage variables.'
                  )}
                </p>
                <div className='flex items-center justify-center gap-2 pt-2'>
                  <Button size='sm' onClick={() => setShowCreate(true)}>
                    <Plus className='h-3.5 w-3.5 mr-1' />
                    {t('environments.createTitle', 'Create Environment')}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => importFileRef.current?.click()}
                  >
                    <Upload className='h-3.5 w-3.5 mr-1' />
                    {t('environments.import', '导入')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Environment Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('environments.deleteTitle', 'Delete environment?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'environments.deleteContent',
                'This will permanently delete "{{name}}" and all its variables. This action cannot be undone.',
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

      {/* Delete Variable Confirmation */}
      <AlertDialog
        open={!!deleteVarTarget}
        onOpenChange={open => {
          if (!open) setDeleteVarTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('environments.deleteVarTitle', 'Delete variable?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'environments.deleteVarContent',
                'This will permanently delete the variable "{{key}}". This action cannot be undone.',
                { key: deleteVarTarget }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteVar()}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnvironmentsPage;
