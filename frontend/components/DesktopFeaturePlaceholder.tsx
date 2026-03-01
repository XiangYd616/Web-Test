import { Cloud, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';

interface DesktopFeaturePlaceholderProps {
  featureName: string;
  description?: string;
}

/**
 * 桌面端功能不可用占位组件
 * 对需要后端服务支持的功能，给出明确的用户提示而非空白页面
 */
const DesktopFeaturePlaceholder = ({
  featureName,
  description,
}: DesktopFeaturePlaceholderProps) => {
  const { t } = useTranslation();

  return (
    <div className='flex items-center justify-center min-h-[60vh]'>
      <Card className='max-w-md w-full'>
        <CardContent className='flex flex-col items-center gap-4 p-8 text-center'>
          <div className='flex items-center justify-center w-16 h-16 rounded-full bg-muted'>
            <Monitor className='w-8 h-8 text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold'>
            {featureName}
          </h3>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            {description ||
              t(
                'desktop.featureUnavailable',
                '此功能需要连接云端服务，桌面离线版暂不支持。您可以通过 Web 版使用完整功能。'
              )}
          </p>
          <div className='flex items-center gap-2 text-xs text-muted-foreground mt-2'>
            <Cloud className='w-3.5 h-3.5' />
            <span>
              {t('desktop.cloudRequired', '需要云端服务')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopFeaturePlaceholder;
