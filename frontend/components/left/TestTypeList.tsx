import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { TEST_TYPE_LABELS, useTestConfig } from '../../context/TestContext';

const TestTypeList = () => {
  const { testTypes, selectedType, selectTestType } = useTestConfig();
  const { t } = useTranslation();
  return (
    <Card className='panel'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-semibold uppercase text-muted-foreground'>
          {t('testTypes.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-2'>
          {testTypes.map(type => (
            <Button
              key={type}
              className={cn(
                buttonVariants({ variant: 'ghost', className: 'w-full justify-start' }),
                selectedType === type && 'bg-accent text-accent-foreground'
              )}
              onClick={() => selectTestType(type)}
            >
              {t(TEST_TYPE_LABELS[type] ?? type)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestTypeList;
