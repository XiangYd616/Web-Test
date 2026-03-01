import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import { useTestConfig, useTestResult } from '../../context/TestContext';

const ConfigSummaryPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { configText: editorConfigText } = useTestConfig();
  const { t } = useTranslation();

  const configText = useMemo(() => {
    // 优先从测试结果中提取 config（测试完成后的完整配置）
    if (resultPayloadText.trim()) {
      try {
        const parsed = JSON.parse(resultPayloadText) as Record<string, unknown>;
        const config = parsed.config as Record<string, unknown> | undefined;
        if (config && typeof config === 'object') {
          return JSON.stringify(config, null, 2);
        }
      } catch {
        // ignore parse error
      }
    }
    // 回退到编辑器中的当前配置（测试运行中也能看到）
    if (editorConfigText.trim()) {
      try {
        const parsed = JSON.parse(editorConfigText);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return editorConfigText;
      }
    }
    return '';
  }, [resultPayloadText, editorConfigText]);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>{t('result.configSummary')}</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 p-0 overflow-hidden'>
        {configText ? (
          <div className='h-full relative'>
            <Textarea
              className='h-full w-full resize-none font-mono text-sm p-4 border-0 rounded-none focus-visible:ring-0'
              readOnly
              value={configText}
            />
          </div>
        ) : (
          <div className='flex items-center justify-center h-full text-muted-foreground text-sm p-4'>
            {t('result.configEmpty')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConfigSummaryPanel;
