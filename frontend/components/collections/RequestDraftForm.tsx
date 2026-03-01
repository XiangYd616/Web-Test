import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';

export interface RequestDraft {
  id: string;
  mode: 'new' | 'edit';
  sourceId?: string;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
}

interface RequestDraftFormProps {
  draft: RequestDraft;
  onUpdate: (id: string, patch: Partial<RequestDraft>) => void;
  onSave: (id: string) => void;
  onCancel: (id: string) => void;
  urlRef?: (input: HTMLInputElement | null) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const RequestDraftForm = forwardRef<HTMLDivElement, RequestDraftFormProps>(
  ({ draft, onUpdate, onSave, onCancel, urlRef }, ref) => {
    const { t } = useTranslation();

    return (
      <div ref={ref} className='space-y-3'>
        <div className='grid grid-cols-12 gap-3'>
          <div className='col-span-3'>
            <Label className='text-xs'>{t('collections.reqMethod', 'Method')}</Label>
            <Select
              value={draft.method}
              onValueChange={value => onUpdate(draft.id, { method: value })}
            >
              <SelectTrigger className='h-8 mt-1'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='col-span-9'>
            <Label className='text-xs'>{t('collections.reqUrl', 'URL')}</Label>
            <Input
              className='h-8 mt-1 font-mono text-xs'
              value={draft.url}
              onChange={e => onUpdate(draft.id, { url: e.target.value })}
              placeholder='https://api.example.com/endpoint'
              ref={urlRef}
            />
          </div>
        </div>
        <div>
          <Label className='text-xs'>{t('collections.reqName', 'Name')}</Label>
          <Input
            className='h-8 mt-1'
            value={draft.name}
            onChange={e => onUpdate(draft.id, { name: e.target.value })}
            placeholder={t('collections.reqNamePlaceholder', 'e.g. Get Users')}
          />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label className='text-xs'>Headers (JSON)</Label>
            <Textarea
              className='mt-1 font-mono text-xs h-20'
              value={draft.headers}
              onChange={e => onUpdate(draft.id, { headers: e.target.value })}
              placeholder='{"Content-Type": "application/json"}'
            />
          </div>
          <div>
            <Label className='text-xs'>Body</Label>
            <Textarea
              className='mt-1 font-mono text-xs h-20'
              value={draft.body}
              onChange={e => onUpdate(draft.id, { body: e.target.value })}
              placeholder='{"key": "value"}'
            />
          </div>
        </div>
        <div className='flex gap-2'>
          <Button
            size='sm'
            onClick={() => onSave(draft.id)}
            disabled={!draft.url.trim()}
          >
            <Save className='h-3.5 w-3.5 mr-1' />
            {draft.mode === 'edit' ? t('common.save') : t('common.add')}
          </Button>
          <Button size='sm' variant='ghost' onClick={() => onCancel(draft.id)}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }
);

RequestDraftForm.displayName = 'RequestDraftForm';

export default RequestDraftForm;
