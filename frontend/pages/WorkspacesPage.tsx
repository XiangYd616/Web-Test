import { Edit2, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useTestWorkspace } from '../context/TestContext';
import useConfirmDialog from '../hooks/useConfirmDialog';
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from '../services/workspaceApi';

type WorkspaceItem = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  createdAt?: string;
};

const WorkspacesPage = () => {
  const { t } = useTranslation();
  const { workspaceId, updateWorkspaceId } = useTestWorkspace();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listWorkspaces();
      setWorkspaces(Array.isArray(list) ? (list as WorkspaceItem[]) : []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = (await createWorkspace({
        name: newName.trim(),
        description: newDesc.trim(),
      })) as WorkspaceItem;
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await refresh();
      if (ws?.id) updateWorkspaceId(ws.id);
      toast.success(t('workspaces.created', '工作空间已创建'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const { state: confirmState, confirm, close: closeConfirm } = useConfirmDialog();

  const handleDelete = (id: string, name: string) => {
    if (id === workspaceId) {
      toast.error(t('workspaces.cannotDeleteActive', '无法删除当前活跃的工作空间'));
      return;
    }
    confirm({
      title: t('workspaces.deleteTitle', '删除工作空间'),
      description: t('workspaces.deleteContent', {
        name,
        defaultValue: `确定要删除工作空间「${name}」吗？此操作不可撤销，该工作空间下的所有集合和环境配置将被一并删除。`,
      }),
      actionLabel: t('common.delete'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteWorkspace(id);
          await refresh();
          toast.success(t('workspaces.deleted', '工作空间已删除'));
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          closeConfirm();
        }
      },
    });
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateWorkspace(id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setEditingId(null);
      await refresh();
      toast.success(t('workspaces.updated', '工作空间已更新'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startEdit = (ws: WorkspaceItem) => {
    setEditingId(ws.id);
    setEditName(ws.name);
    setEditDesc(ws.description || '');
  };

  return (
    <div className='container py-6 space-y-6 max-w-4xl mx-auto'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('workspaces.title', '工作空间管理')}
          </h1>
          <p className='text-muted-foreground text-sm mt-1'>
            {t('workspaces.subtitle', '管理您的工作空间，切换或创建新的工作空间')}
          </p>
        </div>
        <Button
          size='sm'
          onClick={() => setShowCreate(!showCreate)}
          variant={showCreate ? 'secondary' : 'default'}
        >
          <Plus className='h-4 w-4 mr-1' />
          {showCreate ? t('common.cancel') : t('workspaces.create', '新建')}
        </Button>
      </div>

      {showCreate && (
        <Card className='animate-in fade-in slide-in-from-top-4 duration-200'>
          <CardHeader>
            <CardTitle className='text-base'>
              {t('workspaces.createTitle', '创建工作空间')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex gap-4 items-end'>
              <div className='space-y-2 flex-1'>
                <Label>{t('workspaces.name', '名称')}</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={t('workspaces.namePlaceholder', '例如：我的项目')}
                />
              </div>
              <div className='space-y-2 flex-[2]'>
                <Label>{t('workspaces.description', '描述')}</Label>
                <Input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder={t('workspaces.descPlaceholder', '可选描述')}
                />
              </div>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating && <Loader2 className='h-4 w-4 mr-1 animate-spin' />}
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && workspaces.length === 0 ? (
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('workspaces.empty', '暂无工作空间')}
          actionLabel={t('workspaces.create', '创建工作空间')}
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className='grid gap-4'>
          {workspaces.map(ws => (
            <Card
              key={ws.id}
              className={
                ws.id === workspaceId
                  ? 'border-primary/50 shadow-sm'
                  : 'hover:border-border/80 transition-colors'
              }
            >
              <CardContent className='p-4'>
                {editingId === ws.id ? (
                  <div className='flex gap-3 items-end'>
                    <div className='flex-1 space-y-1'>
                      <Label className='text-xs'>{t('workspaces.name', '名称')}</Label>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className='h-8'
                      />
                    </div>
                    <div className='flex-[2] space-y-1'>
                      <Label className='text-xs'>{t('workspaces.description', '描述')}</Label>
                      <Input
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className='h-8'
                      />
                    </div>
                    <Button size='sm' onClick={() => handleUpdate(ws.id)}>
                      {t('common.save')}
                    </Button>
                    <Button size='sm' variant='ghost' onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center justify-between'>
                    <div
                      className='flex-1 cursor-pointer'
                      role='button'
                      tabIndex={0}
                      onClick={() => updateWorkspaceId(ws.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') updateWorkspaceId(ws.id);
                      }}
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{ws.name}</span>
                        {ws.id === workspaceId && (
                          <Badge variant='secondary' className='text-[10px]'>
                            {t('workspaces.active', '当前')}
                          </Badge>
                        )}
                        {ws.role && (
                          <Badge variant='outline' className='text-[10px]'>
                            {ws.role}
                          </Badge>
                        )}
                      </div>
                      {ws.description && (
                        <p className='text-xs text-muted-foreground mt-0.5'>{ws.description}</p>
                      )}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7'
                        onClick={() => startEdit(ws)}
                        title={t('common.edit', '编辑')}
                      >
                        <Edit2 className='h-3.5 w-3.5' />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7 text-muted-foreground hover:text-red-600'
                        onClick={() => handleDelete(ws.id, ws.name)}
                        title={t('common.delete', '删除')}
                        disabled={ws.id === workspaceId}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </div>
  );
};

export default WorkspacesPage;
