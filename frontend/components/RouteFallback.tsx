import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RouteFallback = () => {
  const { t } = useTranslation();
  return (
    <div className='global-loading'>
      <div className='loading-card'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <div className='loading-text'>{t('common.loading', '加载中...')}</div>
      </div>
    </div>
  );
};

export default RouteFallback;
