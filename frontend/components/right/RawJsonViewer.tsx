import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { useTestResult } from '../../context/TestContext';

const RawJsonViewer = () => {
  const { resultPayloadText, updateResultPayloadText } = useTestResult();
  const { t } = useTranslation();
  const [editable, setEditable] = useState(false);

  const jsonErrorLine = useMemo(() => {
    if (!resultPayloadText.trim()) {
      return null;
    }
    try {
      JSON.parse(resultPayloadText);
      return null;
    } catch (error) {
      const messageText = (error as Error).message || '';
      const match = messageText.match(/position\s(\d+)/i);
      if (!match) {
        return null;
      }
      const position = Number(match[1]);
      if (Number.isNaN(position)) {
        return null;
      }
      const before = resultPayloadText.slice(0, position);
      const line = before.split('\n').length;
      return line;
    }
  }, [resultPayloadText]);

  const isJsonValid = jsonErrorLine === null;

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(resultPayloadText || '{}');
      updateResultPayloadText(JSON.stringify(parsed, null, 2));
      toast.success(t('json.formatSuccess'));
    } catch {
      toast.error(t('json.formatError'));
    }
  };

  const handleValidate = () => {
    if (isJsonValid) {
      toast.success(t('json.valid'));
    } else {
      toast.error(t('json.invalid', { line: jsonErrorLine ?? '-' }));
    }
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b space-y-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base font-medium'>{t('json.title')}</CardTitle>
          <div className='flex items-center gap-1.5'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleValidate}
              className='h-7 text-xs px-2'
            >
              {t('json.validate')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleFormat}
              disabled={!editable}
              className='h-7 text-xs px-2'
            >
              {t('json.format')}
            </Button>
            <div className='flex items-center gap-1.5 ml-1'>
              <span className='text-xs text-muted-foreground'>{t('json.editMode')}</span>
              <Switch checked={editable} onCheckedChange={setEditable} />
            </div>
          </div>
        </div>
        {!isJsonValid && (
          <span className='text-destructive text-xs font-medium'>
            {t('json.invalid', { line: jsonErrorLine ?? '-' })}
          </span>
        )}
      </CardHeader>
      <CardContent className='flex-1 p-0 overflow-hidden'>
        <Textarea
          className='h-full w-full resize-none font-mono text-xs p-3 border-0 rounded-none focus-visible:ring-0 min-h-[200px]'
          value={resultPayloadText}
          onChange={event => updateResultPayloadText(event.target.value)}
          readOnly={!editable}
          aria-invalid={!isJsonValid}
        />
      </CardContent>
    </Card>
  );
};

export default RawJsonViewer;
