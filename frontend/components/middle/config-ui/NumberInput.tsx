import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  value: number | string | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  className?: string;
}

export const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  placeholder,
  className,
}: NumberInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0); // Or handle empty differently if needed
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div className='relative'>
      <Input
        type='number'
        value={value ?? ''}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={cn(unit ? 'pr-12' : '', className)}
      />
      {unit && (
        <div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none'>
          {unit}
        </div>
      )}
    </div>
  );
};
