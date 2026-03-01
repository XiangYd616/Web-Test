import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormDataField, QueryParam, RequestMeta } from '../../../context/TestContext';

interface RequestConfigPanelProps {
  requestMeta: RequestMeta;
  onChange: (meta: RequestMeta) => void;
}

export const RequestConfigPanel = ({ requestMeta, onChange }: RequestConfigPanelProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('params');

  const params = requestMeta.queryParams ?? [];
  const bodyType = requestMeta.bodyType ?? 'none';
  const authType = requestMeta.authType ?? 'none';

  const enabledParamCount = params.filter(p => p.enabled && p.key).length;
  const enabledHeaderCount = requestMeta.headers.filter(h => h.enabled && h.key).length;

  return (
    <div className='space-y-3'>
      {/* Method + Content-Type row */}
      <div className='grid md:grid-cols-2 gap-3'>
        <div className='grid gap-1.5'>
          <Label className='text-xs'>{t('editor.method')}</Label>
          <Select
            value={requestMeta.method}
            onValueChange={(method: RequestMeta['method']) => onChange({ ...requestMeta, method })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-1.5'>
          <Label className='text-xs'>{t('editor.contentType')}</Label>
          <Input
            value={requestMeta.contentType}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...requestMeta, contentType: e.target.value })
            }
          />
        </div>
      </div>

      {/* Postman-style sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='h-8 p-0.5'>
          <TabsTrigger value='params' className='text-xs h-7 px-3'>
            {t('editor.params')}
            {enabledParamCount > 0 && (
              <span className='ml-1 text-[10px] bg-primary/15 text-primary rounded-full px-1.5'>
                {enabledParamCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='auth' className='text-xs h-7 px-3'>
            {t('editor.authType')}
          </TabsTrigger>
          <TabsTrigger value='body' className='text-xs h-7 px-3'>
            {t('editor.body')}
          </TabsTrigger>
          <TabsTrigger value='headers' className='text-xs h-7 px-3'>
            {t('editor.headers')}
            {enabledHeaderCount > 0 && (
              <span className='ml-1 text-[10px] bg-primary/15 text-primary rounded-full px-1.5'>
                {enabledHeaderCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Params ── */}
        <TabsContent value='params' className='mt-2 space-y-2'>
          {params.map((param: QueryParam, index: number) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                className='h-8 text-xs'
                value={param.key}
                placeholder={t('editor.paramKey')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const p = [...params];
                  p[index] = { ...p[index], key: e.target.value };
                  onChange({ ...requestMeta, queryParams: p });
                }}
              />
              <Input
                className='h-8 text-xs'
                value={param.value}
                placeholder={t('editor.paramValue')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const p = [...params];
                  p[index] = { ...p[index], value: e.target.value };
                  onChange({ ...requestMeta, queryParams: p });
                }}
              />
              <Switch
                checked={param.enabled}
                onCheckedChange={(c: boolean) => {
                  const p = [...params];
                  p[index] = { ...p[index], enabled: c };
                  onChange({ ...requestMeta, queryParams: p });
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
                    queryParams: params.filter((_: QueryParam, i: number) => i !== index),
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
                queryParams: [...params, { key: '', value: '', enabled: true }],
              })
            }
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            {t('editor.addParam')}
          </Button>
        </TabsContent>

        {/* ── Auth ── */}
        <TabsContent value='auth' className='mt-2 space-y-3'>
          <div className='grid gap-1.5'>
            <Label className='text-xs'>{t('editor.authType')}</Label>
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
                <SelectItem value='none'>{t('editor.authNone')}</SelectItem>
                <SelectItem value='bearer'>{t('editor.authBearer')}</SelectItem>
                <SelectItem value='basic'>{t('editor.authBasic')}</SelectItem>
                <SelectItem value='apikey'>{t('editor.authApiKey')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {authType === 'bearer' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>Token</Label>
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
                <Label className='text-xs'>{t('editor.authUsername')}</Label>
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
                <Label className='text-xs'>{t('editor.authPassword')}</Label>
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
                <Label className='text-xs'>{t('editor.authKeyName')}</Label>
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
                <Label className='text-xs'>{t('editor.authKeyValue')}</Label>
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
        </TabsContent>

        {/* ── Body ── */}
        <TabsContent value='body' className='mt-2 space-y-3'>
          <div className='flex gap-1.5 flex-wrap'>
            {(['none', 'json', 'form', 'formdata', 'text', 'xml'] as const).map(bt => (
              <button
                key={bt}
                type='button'
                onClick={() => onChange({ ...requestMeta, bodyType: bt })}
                className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                  bodyType === bt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                {bt === 'formdata'
                  ? 'form-data'
                  : t(`editor.body${bt.charAt(0).toUpperCase() + bt.slice(1)}`)}
              </button>
            ))}
          </div>

          {bodyType === 'formdata' && (
            <div className='space-y-2'>
              {(requestMeta.formData ?? []).map((field: FormDataField, index: number) => (
                <div key={index} className='flex items-center gap-2'>
                  <Input
                    className='h-8 text-xs'
                    value={field.key}
                    placeholder='Key'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const fd = [...(requestMeta.formData ?? [])];
                      fd[index] = { ...fd[index], key: e.target.value };
                      onChange({ ...requestMeta, formData: fd });
                    }}
                  />
                  <Input
                    className='h-8 text-xs'
                    value={field.value}
                    placeholder='Value'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const fd = [...(requestMeta.formData ?? [])];
                      fd[index] = { ...fd[index], value: e.target.value };
                      onChange({ ...requestMeta, formData: fd });
                    }}
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v: 'text' | 'file') => {
                      const fd = [...(requestMeta.formData ?? [])];
                      fd[index] = { ...fd[index], type: v };
                      onChange({ ...requestMeta, formData: fd });
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs w-20 shrink-0'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='text'>Text</SelectItem>
                      <SelectItem value='file'>File</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() =>
                      onChange({
                        ...requestMeta,
                        formData: (requestMeta.formData ?? []).filter(
                          (_: FormDataField, i: number) => i !== index
                        ),
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
                    formData: [
                      ...(requestMeta.formData ?? []),
                      { key: '', value: '', type: 'text' as const },
                    ],
                  })
                }
              >
                <Plus className='mr-1 h-3.5 w-3.5' />
                {t('editor.addParam')}
              </Button>
            </div>
          )}

          {bodyType !== 'none' && bodyType !== 'formdata' && (
            <Textarea
              className='font-mono text-xs min-h-[120px] resize-y'
              value={requestMeta.body ?? ''}
              placeholder={
                bodyType === 'json'
                  ? '{\n  "key": "value"\n}'
                  : bodyType === 'form'
                    ? 'key1=value1&key2=value2'
                    : bodyType === 'xml'
                      ? '<?xml version="1.0"?>\n<root></root>'
                      : t('editor.bodyPlaceholder')
              }
              onChange={e => onChange({ ...requestMeta, body: e.target.value })}
            />
          )}
        </TabsContent>

        {/* ── Headers ── */}
        <TabsContent value='headers' className='mt-2 space-y-2'>
          {requestMeta.headers.map((header, index) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                className='h-8 text-xs'
                value={header.key}
                placeholder={t('editor.headerKey')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const h = [...requestMeta.headers];
                  h[index] = { ...h[index], key: e.target.value };
                  onChange({ ...requestMeta, headers: h });
                }}
              />
              <Input
                className='h-8 text-xs'
                value={header.value}
                placeholder={t('editor.headerValue')}
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
            {t('editor.addHeader')}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};
