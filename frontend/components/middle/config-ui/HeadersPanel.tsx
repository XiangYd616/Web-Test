import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RequestHeader, RequestMeta } from '../../../context/TestContext';

interface HeadersPanelProps {
  requestMeta: RequestMeta;
  onChange: (meta: RequestMeta) => void;
}

/**
 * 请求头面板（Postman 风格独立 Tab）
 * Key-Value 表格 + 启用/禁用开关
 */
export const HeadersPanel = ({ requestMeta, onChange }: HeadersPanelProps) => {
  const { t } = useTranslation();
  const headers = requestMeta.headers;

  return (
    <div className='space-y-2 py-2'>
      {/* 表头 */}
      <div className='tw-headers-table-head'>
        <span className='flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
          Key
        </span>
        <span className='flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
          Value
        </span>
        <span className='w-10' />
        <span className='w-8' />
      </div>

      {/* 数据行 */}
      {headers.map((header: RequestHeader, index: number) => (
        <div key={index} className='flex items-center gap-2'>
          <Input
            className='h-8 text-xs flex-1'
            value={header.key}
            placeholder='Header Name'
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const h = [...headers];
              h[index] = { ...h[index], key: e.target.value };
              onChange({ ...requestMeta, headers: h });
            }}
          />
          <Input
            className='h-8 text-xs flex-1'
            value={header.value}
            placeholder='Value'
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const h = [...headers];
              h[index] = { ...h[index], value: e.target.value };
              onChange({ ...requestMeta, headers: h });
            }}
          />
          <Switch
            checked={header.enabled}
            onCheckedChange={(c: boolean) => {
              const h = [...headers];
              h[index] = { ...h[index], enabled: c };
              onChange({ ...requestMeta, headers: h });
            }}
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={() =>
              onChange({
                ...requestMeta,
                headers: headers.filter((_, i) => i !== index),
              })
            }
          >
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      ))}

      {/* 添加按钮 */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-7 text-xs'
        onClick={() =>
          onChange({
            ...requestMeta,
            headers: [...headers, { key: '', value: '', enabled: true }],
          })
        }
      >
        <Plus className='mr-1 h-3.5 w-3.5' />
        {t('editor.addHeader', '添加请求头')}
      </Button>
    </div>
  );
};
