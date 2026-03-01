import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RequestMeta } from '../../../context/TestContext';

interface AuthPanelProps {
  requestMeta: RequestMeta;
  onChange: (meta: RequestMeta) => void;
}

/**
 * 认证面板（Postman 风格独立 Tab）
 * 包含：认证方式选择 + Token/Basic/API Key 配置
 */
export const AuthPanel = ({ requestMeta, onChange }: AuthPanelProps) => {
  const { t } = useTranslation();
  const authType = requestMeta.authType ?? 'none';

  return (
    <div className='space-y-4 py-2'>
      <div className='grid gap-1.5'>
        <label className='text-xs font-medium'>{t('editor.authType', '认证方式')}</label>
        <Select
          value={authType}
          onValueChange={(v: RequestMeta['authType']) => onChange({ ...requestMeta, authType: v })}
        >
          <SelectTrigger className='h-8 text-xs w-48'>
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

      {authType === 'none' && (
        <p className='text-xs text-muted-foreground'>
          {t('editor.authNoneHint', '当前未配置认证，请求将不携带认证信息。')}
        </p>
      )}
    </div>
  );
};
