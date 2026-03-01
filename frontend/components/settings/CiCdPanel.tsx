/**
 * CI/CD 配置面板
 * 管理 API Key 和 Webhook 配置
 */

import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useTestWorkspace } from '../../context/TestContext';
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
  updateWebhook,
  type CiApiKey,
  type CiWebhook,
} from '../../services/ciApi';

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
};

const CiCdPanel = () => {
  const { workspaceId } = useTestWorkspace();
  const [apiKeys, setApiKeys] = useState<CiApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<CiWebhook[]>([]);
  const [loading, setLoading] = useState(false);

  // 新建 API Key 表单
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // 新建 Webhook 表单
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, hooks] = await Promise.all([
        listApiKeys(workspaceId || undefined),
        listWebhooks(workspaceId || undefined),
      ]);
      setApiKeys(keys);
      setWebhooks(hooks);
    } catch {
      toast.error('加载 CI/CD 配置失败');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let ignore = false;
    void fetchData().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // ==================== API Key 操作 ====================

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('请输入 API Key 名称');
      return;
    }
    setCreating(true);
    try {
      const result = await createApiKey({
        name: newKeyName.trim(),
        workspaceId: workspaceId || undefined,
      });
      setCreatedKey(result.key);
      setKeyVisible(true);
      setNewKeyName('');
      toast.success('API Key 已创建，请妥善保存');
      await fetchData();
    } catch {
      toast.error('创建 API Key 失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await revokeApiKey(keyId);
      toast.success('API Key 已撤销');
      await fetchData();
    } catch {
      toast.error('撤销 API Key 失败');
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // ==================== Webhook 操作 ====================

  const handleCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.error('请填写 Webhook 名称和 URL');
      return;
    }
    setCreatingWebhook(true);
    try {
      await createWebhook({
        name: webhookName.trim(),
        url: webhookUrl.trim(),
        secret: webhookSecret.trim() || undefined,
        workspaceId: workspaceId || undefined,
      });
      setWebhookName('');
      setWebhookUrl('');
      setWebhookSecret('');
      setShowNewWebhook(false);
      toast.success('Webhook 已创建');
      await fetchData();
    } catch {
      toast.error('创建 Webhook 失败');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleToggleWebhook = async (hook: CiWebhook) => {
    try {
      await updateWebhook(hook.id, { active: !hook.active });
      await fetchData();
    } catch {
      toast.error('更新 Webhook 失败');
    }
  };

  const handleDeleteWebhook = async (hookId: string) => {
    try {
      await deleteWebhook(hookId);
      toast.success('Webhook 已删除');
      await fetchData();
    } catch {
      toast.error('删除 Webhook 失败');
    }
  };

  return (
    <div className='space-y-6'>
      {/* API Key 管理 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Key className='h-5 w-5' />
                API Key 管理
              </CardTitle>
              <CardDescription>创建和管理用于 CI/CD 流水线的 API Key</CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => void fetchData()}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button
                size='sm'
                onClick={() => {
                  setShowNewKey(true);
                  setCreatedKey(null);
                }}
              >
                <Plus className='h-3.5 w-3.5 mr-1.5' />
                新建
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 创建表单 */}
          {showNewKey && (
            <div className='rounded-lg border p-4 space-y-3 bg-muted/30'>
              <div className='grid gap-2'>
                <Label>名称</Label>
                <Input
                  placeholder='例如: GitHub Actions'
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                />
              </div>
              <div className='flex gap-2'>
                <Button size='sm' onClick={() => void handleCreateKey()} disabled={creating}>
                  {creating && <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />}
                  创建
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={() => {
                    setShowNewKey(false);
                    setCreatedKey(null);
                  }}
                >
                  取消
                </Button>
              </div>
              {createdKey && (
                <div className='rounded-md border border-green-200 bg-green-50 p-3 space-y-2'>
                  <p className='text-sm font-medium text-green-800'>
                    API Key 已创建，请立即复制保存：
                  </p>
                  <div className='flex items-center gap-2'>
                    <code className='flex-1 text-xs font-mono bg-white rounded px-2 py-1 border'>
                      {keyVisible ? createdKey : '•'.repeat(40)}
                    </code>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-7 w-7'
                      onClick={() => setKeyVisible(!keyVisible)}
                    >
                      {keyVisible ? (
                        <EyeOff className='h-3.5 w-3.5' />
                      ) : (
                        <Eye className='h-3.5 w-3.5' />
                      )}
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-7 w-7'
                      onClick={() => copyToClipboard(createdKey)}
                    >
                      <Copy className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                  <p className='text-xs text-green-700'>此 Key 不会再次显示，请妥善保存。</p>
                </div>
              )}
            </div>
          )}

          {/* Key 列表 */}
          {loading && apiKeys.length === 0 ? (
            <div className='flex items-center justify-center py-8 text-muted-foreground text-sm'>
              <Loader2 className='h-4 w-4 animate-spin mr-2' /> 加载中...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              暂无 API Key，点击&ldquo;新建&rdquo;创建一个
            </div>
          ) : (
            <div className='rounded-md border divide-y'>
              {apiKeys.map(key => (
                <div key={key.id} className='p-3 flex items-center justify-between'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm'>{key.name}</span>
                      <code className='text-xs text-muted-foreground font-mono'>
                        {key.keyPrefix}...
                      </code>
                      {key.revoked && (
                        <Badge variant='destructive' className='text-xs'>
                          已撤销
                        </Badge>
                      )}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      创建于 {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` · 最后使用 ${formatDate(key.lastUsedAt)}`}
                    </div>
                  </div>
                  {!key.revoked && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-red-600 hover:text-red-700 hover:bg-red-50'
                      onClick={() => void handleRevokeKey(key.id)}
                    >
                      <XCircle className='h-3.5 w-3.5 mr-1' />
                      撤销
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook 管理 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Webhook className='h-5 w-5' />
                Webhook 配置
              </CardTitle>
              <CardDescription>配置测试完成后的回调通知</CardDescription>
            </div>
            <Button size='sm' onClick={() => setShowNewWebhook(true)}>
              <Plus className='h-3.5 w-3.5 mr-1.5' />
              新建
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 创建表单 */}
          {showNewWebhook && (
            <div className='rounded-lg border p-4 space-y-3 bg-muted/30'>
              <div className='grid gap-2'>
                <Label>名称</Label>
                <Input
                  placeholder='例如: Slack 通知'
                  value={webhookName}
                  onChange={e => setWebhookName(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>URL</Label>
                <Input
                  placeholder='https://hooks.slack.com/...'
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label>Secret (可选)</Label>
                <Input
                  placeholder='用于验证签名'
                  value={webhookSecret}
                  onChange={e => setWebhookSecret(e.target.value)}
                />
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  onClick={() => void handleCreateWebhook()}
                  disabled={creatingWebhook}
                >
                  {creatingWebhook && <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />}
                  创建
                </Button>
                <Button size='sm' variant='ghost' onClick={() => setShowNewWebhook(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* Webhook 列表 */}
          {webhooks.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              暂无 Webhook，点击&ldquo;新建&rdquo;添加一个
            </div>
          ) : (
            <div className='rounded-md border divide-y'>
              {webhooks.map(hook => (
                <div key={hook.id} className='p-3 flex items-center justify-between'>
                  <div className='space-y-1 flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm'>{hook.name}</span>
                      {hook.active ? (
                        <Badge variant='secondary' className='text-xs text-green-700 bg-green-50'>
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant='secondary' className='text-xs'>
                          已禁用
                        </Badge>
                      )}
                      {hook.failureCount > 0 && (
                        <Badge variant='destructive' className='text-xs'>
                          失败 {hook.failureCount} 次
                        </Badge>
                      )}
                    </div>
                    <div className='text-xs text-muted-foreground truncate'>{hook.url}</div>
                    <div className='flex gap-1 flex-wrap'>
                      {hook.events.map(ev => (
                        <Badge key={ev} variant='outline' className='text-xs'>
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className='flex items-center gap-2 ml-4'>
                    <Switch
                      checked={hook.active}
                      onCheckedChange={() => void handleToggleWebhook(hook)}
                    />
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50'
                      onClick={() => void handleDeleteWebhook(hook.id)}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>CI/CD 集成指南</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='rounded-md bg-muted p-4 space-y-2'>
            <p className='text-sm font-medium'>GitHub Actions 示例</p>
            <pre className='text-xs font-mono bg-background rounded p-3 overflow-x-auto border'>
              {`- name: Run Performance Test
  run: |
    curl -X POST \\
      -H "Authorization: Bearer ${'$'}{{ secrets.TESTWEB_API_KEY }}" \\
      -H "Content-Type: application/json" \\
      -d '{"url": "${'$'}{{ env.DEPLOY_URL }}", "testType": "performance"}' \\
      ${'$'}{{ secrets.TESTWEB_URL }}/api/ci/trigger`}
            </pre>
          </div>
          <div className='rounded-md bg-muted p-4 space-y-2'>
            <p className='text-sm font-medium'>查询测试结果</p>
            <pre className='text-xs font-mono bg-background rounded p-3 overflow-x-auto border'>
              {`curl -H "Authorization: Bearer ${'$'}API_KEY" \\
  ${'$'}TESTWEB_URL/api/ci/result/${'$'}TEST_ID`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CiCdPanel;
