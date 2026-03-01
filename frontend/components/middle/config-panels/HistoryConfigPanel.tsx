import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoryMeta } from '../../../context/TestContext';

interface HistoryConfigPanelProps {
  historyMeta: HistoryMeta;
  onChange: (meta: HistoryMeta) => void;
}

export const HistoryConfigPanel = ({ historyMeta, onChange }: HistoryConfigPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-4'>
      <div className='grid md:grid-cols-2 gap-4 items-center'>
        <div className='flex items-center space-x-2'>
          <Switch
            id='save-history'
            checked={historyMeta.saveToHistory}
            onCheckedChange={(c: boolean) => onChange({ ...historyMeta, saveToHistory: c })}
          />
          <Label htmlFor='save-history'>{t('editor.historySave')}</Label>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('editor.historyTitle')}</Label>
          <Input
            value={historyMeta.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...historyMeta, title: e.target.value })
            }
          />
        </div>
      </div>
      <div className='grid md:grid-cols-2 gap-4'>
        <div className='grid gap-1.5'>
          <Label>{t('editor.historyTags')}</Label>
          <Input
            value={historyMeta.tags.join(', ')}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...historyMeta,
                tags: e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={t('editor.tagsPlaceholder')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('editor.historyRetention')}</Label>
          <Input
            type='number'
            min={1}
            max={365}
            value={historyMeta.retentionDays}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...historyMeta,
                retentionDays: Number(e.target.value) || 30,
              })
            }
          />
        </div>
      </div>
      <div className='grid gap-1.5'>
        <Label>{t('editor.historyBaseline')}</Label>
        <Input
          value={historyMeta.baselineId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...historyMeta, baselineId: e.target.value })
          }
        />
      </div>
      <div className='grid gap-1.5'>
        <Label>{t('editor.historyNotes')}</Label>
        <Textarea
          value={historyMeta.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ ...historyMeta, notes: e.target.value })
          }
        />
      </div>
    </div>
  );
};
