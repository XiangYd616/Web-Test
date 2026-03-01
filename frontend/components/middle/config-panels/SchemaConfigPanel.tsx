import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TestTypeSchema } from '../../../utils/testConfigSchema';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';

interface SchemaConfigPanelProps {
  schema: TestTypeSchema;
  values: Record<string, unknown>;
  onChange: (path: string[], value: unknown) => void;
}

export const SchemaConfigPanel = ({ schema, values, onChange }: SchemaConfigPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-4'>
      {schema.sections.map(section => (
        <ConfigSection key={section.key} title={t(section.label)}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {section.fields.map(field => {
              const rawValue = values[field.key];
              const fieldLabel = t(field.label);

              if (field.type === 'boolean') {
                return (
                  <ConfigField key={field.key} label={fieldLabel} horizontal>
                    <Switch
                      checked={Boolean(rawValue ?? field.defaultValue)}
                      onCheckedChange={(value: boolean) => onChange(field.path, value)}
                    />
                  </ConfigField>
                );
              }

              if (field.type === 'select') {
                return (
                  <ConfigField key={field.key} label={fieldLabel}>
                    <Select
                      value={String(rawValue ?? field.defaultValue ?? '')}
                      onValueChange={value => onChange(field.path, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map(option => (
                          <SelectItem key={String(option.value)} value={String(option.value)}>
                            {t(String(option.label))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ConfigField>
                );
              }

              if (field.type === 'number') {
                const numericValue =
                  typeof rawValue === 'number' || rawValue === ''
                    ? rawValue
                    : rawValue === undefined
                      ? undefined
                      : Number(rawValue);
                return (
                  <ConfigField key={field.key} label={fieldLabel}>
                    <NumberInput
                      value={numericValue as number | undefined}
                      onChange={value => onChange(field.path, value)}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                    />
                  </ConfigField>
                );
              }

              return (
                <ConfigField key={field.key} label={fieldLabel}>
                  <Input
                    value={String(rawValue ?? '')}
                    placeholder={field.placeholder}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onChange(field.path, e.target.value)
                    }
                  />
                </ConfigField>
              );
            })}
          </div>
        </ConfigSection>
      ))}
    </div>
  );
};
