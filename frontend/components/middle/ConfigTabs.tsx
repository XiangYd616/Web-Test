import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

type ConfigTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

const ConfigTabs = ({ value, onValueChange, className }: ConfigTabsProps) => {
  const { t } = useTranslation();
  const tabs = [
    { value: 'config', label: t('editor.config') },
    { value: 'headers', label: t('editor.headers') },
    { value: 'history', label: t('editor.history') },
    { value: 'advanced', label: t('editor.advanced') },
  ];

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default ConfigTabs;
