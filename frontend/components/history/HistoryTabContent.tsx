import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTestStatusMeta } from '@/constants/status';
import { type TestStatus } from '@/context/TestContext';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/date';

interface HistoryItem {
  id?: string;
  label?: string;
  url?: string;
  status?: string;
  type?: string;
  createdAt?: string;
}

interface HistoryTabContentProps {
  currentId: string | undefined;
  history: HistoryItem[];
  testTypeStr: string;
}

const HistoryTabContent = ({ currentId, history, testTypeStr }: HistoryTabContentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg font-medium'>
          {t('historyTabs.historyTitle', '测试历史记录')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className='text-center py-8 text-sm text-muted-foreground'>
            {t('historyTabs.historyEmpty', '暂无历史记录')}
          </div>
        ) : (
          <div className='rounded-md border divide-y max-h-[500px] overflow-auto'>
            {history
              .filter(item => {
                const itemType = String(item.type || '').toLowerCase();
                return !testTypeStr || itemType === testTypeStr;
              })
              .slice(0, 50)
              .map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={cn(
                    'p-3 flex items-center justify-between text-sm hover:bg-muted/50 cursor-pointer',
                    item.id === currentId && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                  role='button'
                  tabIndex={0}
                  onClick={() => {
                    if (item.id && item.id !== currentId) {
                      navigate(`/history/${item.id}`);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (item.id && item.id !== currentId) {
                        navigate(`/history/${item.id}`);
                      }
                    }
                  }}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <span className='font-mono text-xs text-muted-foreground truncate max-w-[120px]'>
                      {item.id?.slice(0, 8) || '-'}
                    </span>
                    <span className='truncate'>{item.label || String(item.url || '-')}</span>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    {(() => {
                      const meta = getTestStatusMeta(
                        String(item.status || 'pending') as TestStatus
                      );
                      return (
                        <Badge
                          style={{
                            backgroundColor: meta.color,
                            color: '#fff',
                            fontSize: '10px',
                          }}
                          className='border-none'
                        >
                          {t(meta.label)}
                        </Badge>
                      );
                    })()}
                    <span className='text-xs text-muted-foreground'>
                      {formatRelativeTime(item.createdAt ? String(item.createdAt) : undefined)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryTabContent;
