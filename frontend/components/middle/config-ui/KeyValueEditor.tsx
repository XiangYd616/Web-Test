import { Plus, Trash2 } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addButtonLabel?: string;
}

export const KeyValueEditor = ({
  items,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addButtonLabel,
}: KeyValueEditorProps) => {
  const { t } = useTranslation();

  const handleKeyChange = (index: number, newKey: string) => {
    const next = [...items];
    next[index] = { ...next[index], key: newKey };
    onChange(next);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const next = [...items];
    next[index] = { ...next[index], value: newValue };
    onChange(next);
  };

  const handleAdd = () => {
    onChange([...items, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className='space-y-2'>
      {items.map((item, index) => (
        <div key={index} className='flex items-center gap-2'>
          <Input
            value={item.key}
            placeholder={keyPlaceholder || 'Key'}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleKeyChange(index, e.target.value)}
            className='flex-1'
          />
          <Input
            value={item.value}
            placeholder={valuePlaceholder || 'Value'}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleValueChange(index, e.target.value)
            }
            className='flex-1'
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => handleRemove(index)}
            className='shrink-0'
          >
            <Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
          </Button>
        </div>
      ))}
      <Button type='button' variant='outline' size='sm' onClick={handleAdd} className='mt-2'>
        <Plus className='mr-2 h-4 w-4' />
        {addButtonLabel || t('common.add', 'Add')}
      </Button>
    </div>
  );
};
