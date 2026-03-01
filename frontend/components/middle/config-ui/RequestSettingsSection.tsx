import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RequestHeader, RequestMeta } from '../../../context/TestContext';
import { ConfigSection } from './ConfigSection';

interface RequestSettingsSectionProps {
  requestMeta: RequestMeta;
  onChange: (meta: RequestMeta) => void;
}

/**
 * 精简版请求设置区块（可折叠）
 * 仅包含：认证方式 + 自定义请求头
 * 用于嵌入各测试类型的配置面板底部
 */
export const RequestSettingsSection = ({
  requestMeta,
  onChange,
}: RequestSettingsSectionProps) => {
  const { t } = useTranslation();
  const authType = requestMeta.authType ?? 'none';
  const enabledHeaderCount = requestMeta.headers.filter(h => h.enabled && h.key).length;

  return (
    <ConfigSection
      title={`${t('editor.requestSettings', '请求设置')}${enabledHeaderCount > 0 ? ` (${enabledHeaderCount} 自定义头)` : ''}`}
      defaultOpen={false}
    >
      <div className='space-y-4'>
        {/* 认证方式 */}
        <div className='space-y-3'>
          <div className='grid gap-1.5'>
            <label className='text-xs font-medium'>{t('editor.authType', '认证方式')}</label>
            <Select
              value={authType}
              onValueChange={(v: RequestMeta['authType']) =>
                onChange({ ...requestMeta, authType: v })
              }
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>{t('editor.authNone', '无认证')}</SelectItem>
                <SelectItem value='bearer'>{t('editor.authBearer', 'Bearer Token')}</SelectItem>
                <SelectItem value='basic'>{t('editor.authBasic', 'Basic Auth')}</SelectItem>
                <SelectItem value='apikey'>{t('editor.authApiKey', 'API Key')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType === 'bearer' && (
            <div className='grid gap-1.5'>
              <label className='text-xs font-medium'>Token</label>
              <Input
                className='h-8 text-xs font-mono'
                type='password'
                value={requestMeta.authToken}
                placeholder='Bearer token...'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onChange({ ...requestMeta, authToken: e.target.value })
                }
              />
            </div>
          )}

          {authType === 'basic' && (
            <div className='grid grid-cols-2 gap-3'>
              <div className='grid gap-1.5'>
                <label className='text-xs font-medium'>{t('editor.authUsername', '用户名')}</label>
                <Input
                  className='h-8 text-xs'
                  value={requestMeta.authToken.split(':')[0] || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const pass = requestMeta.authToken.split(':').slice(1).join(':');
                    onChange({ ...requestMeta, authToken: `${e.target.value}:${pass}` });
                  }}
                />
              </div>
              <div className='grid gap-1.5'>
                <label className='text-xs font-medium'>{t('editor.authPassword', '密码')}</label>
                <Input
                  className='h-8 text-xs'
                  type='password'
                  value={requestMeta.authToken.split(':').slice(1).join(':') || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const user = requestMeta.authToken.split(':')[0] || '';
                    onChange({ ...requestMeta, authToken: `${user}:${e.target.value}` });
                  }}
                />
              </div>
            </div>
          )}

          {authType === 'apikey' && (
            <div className='grid grid-cols-2 gap-3'>
              <div className='grid gap-1.5'>
                <label className='text-xs font-medium'>{t('editor.authKeyName', 'Key 名称')}</label>
                <Input
                  className='h-8 text-xs'
                  value={requestMeta.authToken.split('=')[0] || ''}
                  placeholder='X-API-Key'
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = requestMeta.authToken.split('=').slice(1).join('=');
                    onChange({ ...requestMeta, authToken: `${e.target.value}=${val}` });
                  }}
                />
              </div>
              <div className='grid gap-1.5'>
                <label className='text-xs font-medium'>{t('editor.authKeyValue', 'Key 值')}</label>
                <Input
                  className='h-8 text-xs font-mono'
                  type='password'
                  value={requestMeta.authToken.split('=').slice(1).join('=') || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const name = requestMeta.authToken.split('=')[0] || '';
                    onChange({ ...requestMeta, authToken: `${name}=${e.target.value}` });
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 自定义请求头 */}
        <div className='space-y-2 pt-2 border-t'>
          <label className='text-xs font-medium'>{t('editor.customHeaders', '自定义请求头')}</label>
          {requestMeta.headers.map((header: RequestHeader, index: number) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                className='h-8 text-xs'
                value={header.key}
                placeholder={t('editor.headerKey', 'Header Name')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const h = [...requestMeta.headers];
                  h[index] = { ...h[index], key: e.target.value };
                  onChange({ ...requestMeta, headers: h });
                }}
              />
              <Input
                className='h-8 text-xs'
                value={header.value}
                placeholder={t('editor.headerValue', 'Value')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const h = [...requestMeta.headers];
                  h[index] = { ...h[index], value: e.target.value };
                  onChange({ ...requestMeta, headers: h });
                }}
              />
              <Switch
                checked={header.enabled}
                onCheckedChange={(c: boolean) => {
                  const h = [...requestMeta.headers];
                  h[index] = { ...h[index], enabled: c };
                  onChange({ ...requestMeta, headers: h });
                }}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() =>
                  onChange({
                    ...requestMeta,
                    headers: requestMeta.headers.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() =>
              onChange({
                ...requestMeta,
                headers: [...requestMeta.headers, { key: '', value: '', enabled: true }],
              })
            }
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            {t('editor.addHeader', '添加请求头')}
          </Button>
        </div>
      </div>
    </ConfigSection>
  );
};
