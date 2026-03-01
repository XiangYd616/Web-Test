import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getTestStatusMeta } from '../../constants/status';
import { HistoryItem as HistoryItemType, useTestHistory } from '../../context/TestContext';
import { formatRelativeTime } from '../../utils/date';

const badgeVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  blue: 'default',
  green: 'secondary',
  red: 'destructive',
};

interface HistoryItemProps {
  item: HistoryItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const HistoryItem = memo(({ item, isSelected, onSelect }: HistoryItemProps) => {
  const { t } = useTranslation();
  const statusMeta = getTestStatusMeta(item.status);
  const badgeVariant = badgeVariantMap[statusMeta.color] || 'default';
  const handleSelect = useCallback(() => onSelect(item.id), [onSelect, item.id]);

  return (
    <li key={item.id}>
      <Button
        className={cn(
          buttonVariants({
            variant: 'ghost',
            className: 'w-full h-auto flex flex-col items-start p-2 justify-start text-left',
          }),
          isSelected && 'bg-accent text-accent-foreground'
        )}
        onClick={handleSelect}
      >
        <span className='font-semibold truncate w-full'>{item.label}</span>
        <div className='flex items-center justify-between w-full mt-1'>
          <Badge className={badgeVariants({ variant: badgeVariant })}>{t(statusMeta.label)}</Badge>
          <span className='text-xs text-muted-foreground'>
            {formatRelativeTime(item.updatedAt || item.createdAt)}
          </span>
        </div>
      </Button>
    </li>
  );
});

HistoryItem.displayName = 'HistoryItem';

const HistoryList = () => {
  const { history, selectedHistoryId, selectHistory } = useTestHistory();
  const { t } = useTranslation();

  return (
    <Card className='panel'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-semibold uppercase text-muted-foreground'>
          {t('history.recent')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <ul className='flex flex-col gap-2 list-none p-0 m-0'>
            {history.map(item => (
              <HistoryItem
                key={item.id}
                item={item}
                isSelected={selectedHistoryId === item.id}
                onSelect={selectHistory}
              />
            ))}
          </ul>
        ) : (
          <div className='text-sm text-muted-foreground text-center py-4'>
            {t('common.noData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryList;
