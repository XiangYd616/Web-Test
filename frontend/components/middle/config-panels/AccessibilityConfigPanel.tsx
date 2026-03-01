import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Accessibility } from 'lucide-react';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ElementSelectorTool, { type SelectorEntry } from '../ElementSelectorTool';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';

/* ---------- 快捷预设 ---------- */
const CHECK_KEYS = [
  'checkColorContrast',
  'checkKeyboardNavigation',
  'checkScreenReaders',
  'checkForms',
  'checkImages',
  'checkHeadings',
  'checkLinks',
  'checkTables',
  'checkLists',
  'checkIFrames',
  'checkLanguage',
  'checkZoom',
] as const;

const PRESETS = [
  {
    name: '快速扫描',
    description: '仅核心 4 项检查，适合快速验证基本可访问性',
    options: {
      standards: ['WCAG2.1'],
      level: 'A',
      checkColorContrast: true,
      checkImages: true,
      checkHeadings: true,
      checkForms: true,
      checkKeyboardNavigation: false,
      checkScreenReaders: false,
      checkLinks: false,
      checkTables: false,
      checkLists: false,
      checkIFrames: false,
      checkLanguage: false,
      checkZoom: false,
      includeWarnings: false,
    },
  },
  {
    name: '标准检查',
    description: '全部 12 项检查 + WCAG 2.1 AA，适合常规审计',
    options: {
      standards: ['WCAG2.1'],
      level: 'AA',
      ...Object.fromEntries(CHECK_KEYS.map(k => [k, true])),
      includeWarnings: true,
    },
  },
  {
    name: '深度审计',
    description: '全部检查 + WCAG 2.2 AAA，最严格的合规性审计',
    options: {
      standards: ['WCAG2.1', 'WCAG2.2'],
      level: 'AAA',
      ...Object.fromEntries(CHECK_KEYS.map(k => [k, true])),
      includeWarnings: true,
    },
  },
];

/* ---------- 检查项定义（含描述） ---------- */
const CHECKS = [
  {
    key: 'checkColorContrast',
    label: 'editor.accessibilityCheckColorContrast',
    desc: 'editor.accessibilityCheckColorContrastDesc',
    descFallback: 'Verify text/background color contrast meets WCAG ratio requirements',
  },
  {
    key: 'checkKeyboardNavigation',
    label: 'editor.accessibilityCheckKeyboardNavigation',
    desc: 'editor.accessibilityCheckKeyboardNavigationDesc',
    descFallback: 'Check tabindex, focus order, and keyboard-operable interactive elements',
  },
  {
    key: 'checkScreenReaders',
    label: 'editor.accessibilityCheckScreenReaders',
    desc: 'editor.accessibilityCheckScreenReadersDesc',
    descFallback: 'Validate ARIA roles, labels, and screen reader compatibility',
  },
  {
    key: 'checkForms',
    label: 'editor.accessibilityCheckForms',
    desc: 'editor.accessibilityCheckFormsDesc',
    descFallback: 'Ensure form inputs have associated labels and error descriptions',
  },
  {
    key: 'checkImages',
    label: 'editor.accessibilityCheckImages',
    desc: 'editor.accessibilityCheckImagesDesc',
    descFallback: 'Check that images have meaningful alt text or are marked decorative',
  },
  {
    key: 'checkHeadings',
    label: 'editor.accessibilityCheckHeadings',
    desc: 'editor.accessibilityCheckHeadingsDesc',
    descFallback: 'Verify heading hierarchy (h1-h6) is logical and not skipping levels',
  },
  {
    key: 'checkLinks',
    label: 'editor.accessibilityCheckLinks',
    desc: 'editor.accessibilityCheckLinksDesc',
    descFallback: 'Check link text is descriptive and distinguishable from surrounding text',
  },
  {
    key: 'checkTables',
    label: 'editor.accessibilityCheckTables',
    desc: 'editor.accessibilityCheckTablesDesc',
    descFallback: 'Validate table headers, captions, and proper scope attributes',
  },
  {
    key: 'checkLists',
    label: 'editor.accessibilityCheckLists',
    desc: 'editor.accessibilityCheckListsDesc',
    descFallback: 'Check semantic HTML usage: lists, landmarks, and structural elements',
  },
  {
    key: 'checkIFrames',
    label: 'editor.accessibilityCheckIFrames',
    desc: 'editor.accessibilityCheckIFramesDesc',
    descFallback: 'Validate ARIA attributes: roles, states, properties, and references',
  },
  {
    key: 'checkLanguage',
    label: 'editor.accessibilityCheckLanguage',
    desc: 'editor.accessibilityCheckLanguageDesc',
    descFallback: 'Check that lang attribute is present and valid on html and content elements',
  },
  {
    key: 'checkZoom',
    label: 'editor.accessibilityCheckZoom',
    desc: 'editor.accessibilityCheckZoomDesc',
    descFallback: 'Verify focus indicators are visible and focus is managed correctly',
  },
];

interface AccessibilityConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const AccessibilityConfigPanel = ({ options, onChange }: AccessibilityConfigPanelProps) => {
  const { t } = useTranslation();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setActivePreset(preset.name);
      onChange(preset.options);
    },
    [onChange]
  );

  const userChange = useCallback(
    (patch: Record<string, unknown>) => {
      setActivePreset(null);
      onChange(patch);
    },
    [onChange]
  );

  const getListString = (key: string) => {
    const raw = options[key];
    if (!Array.isArray(raw)) return '';
    return raw.map(item => String(item)).join(', ');
  };

  const handleListChange = (key: string, value: string) => {
    const list = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    userChange({ [key]: list });
  };

  const enabledCount = CHECK_KEYS.filter(k => options[k] !== false).length;
  const allChecked = enabledCount === CHECK_KEYS.length;
  const noneChecked = enabledCount === 0;

  const toggleAll = (val: boolean) => {
    const patch: Record<string, boolean> = {};
    CHECK_KEYS.forEach(k => {
      patch[k] = val;
    });
    userChange(patch);
  };

  const selectorEntries = useMemo<SelectorEntry[]>(() => {
    const raw = options.targetSelectors;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is SelectorEntry =>
        item && typeof item === 'object' && typeof item.selector === 'string'
    );
  }, [options.targetSelectors]);

  const handleSelectorChange = (next: SelectorEntry[]) => {
    userChange({ targetSelectors: next });
  };

  return (
    <ConfigSection title={t('editor.accessibilityPanelTitle', 'Accessibility Settings')}>
      <div className='space-y-6'>
        {/* 快捷预设 */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Accessibility className='h-3.5 w-3.5 text-blue-500 shrink-0' />
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              type='button'
              title={preset.description}
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                activePreset === preset.name
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ConfigField
            label={t('editor.accessibilityStandards', 'Standards')}
            description={t('editor.accessibilityStandardsDesc', 'WCAG2.1, WCAG2.2, etc.')}
          >
            <Input
              value={getListString('standards')}
              placeholder='WCAG2.1, WCAG2.2'
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleListChange('standards', e.target.value)
              }
            />
          </ConfigField>

          <ConfigField label={t('editor.accessibilityLevel', 'Conformance Level')}>
            <Select
              value={String(options.level || 'AA')}
              onValueChange={value => userChange({ level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['A', 'AA', 'AAA'].map(item => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>
        </div>

        <div className='bg-muted/20 rounded-lg p-4'>
          <div className='flex items-center justify-between mb-4'>
            <div className='text-sm font-medium text-muted-foreground'>
              {t('editor.accessibilityChecks', 'Automated Checks')}
              <span className='ml-2 text-[10px] font-normal'>
                ({enabledCount}/{CHECK_KEYS.length})
              </span>
            </div>
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                disabled={allChecked}
                onClick={() => toggleAll(true)}
                className='px-2 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
              >
                {t('editor.accessibilitySelectAll', 'Select All')}
              </button>
              <button
                type='button'
                disabled={noneChecked}
                onClick={() => toggleAll(false)}
                className='px-2 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
              >
                {t('editor.accessibilityDeselectAll', 'Deselect All')}
              </button>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4'>
            {CHECKS.map(check => (
              <ConfigField
                key={check.key}
                label={t(check.label)}
                description={t(check.desc, check.descFallback)}
                horizontal
              >
                <Switch
                  checked={options[check.key] !== false}
                  onCheckedChange={val => userChange({ [check.key]: val })}
                />
              </ConfigField>
            ))}
          </div>
        </div>

        <div className='bg-muted/20 rounded-lg p-4'>
          <ConfigField
            label={t('editor.accessibilityIncludeWarnings', 'Include Warnings')}
            description={t(
              'editor.accessibilityIncludeWarningsDesc',
              'Include warning-level issues in results (not just errors)'
            )}
            horizontal
          >
            <Switch
              checked={options.includeWarnings !== false}
              onCheckedChange={val => userChange({ includeWarnings: val })}
            />
          </ConfigField>
        </div>

        <div className='bg-muted/20 rounded-lg p-4'>
          <div className='text-sm font-medium mb-3 text-muted-foreground'>
            {t('editor.accessibilityTargetElements', 'Target Elements (Optional)')}
          </div>
          <p className='text-xs text-muted-foreground mb-3'>
            {t(
              'editor.accessibilityTargetElementsDesc',
              'Specify CSS/XPath selectors to focus accessibility checks on specific elements. Leave empty to scan the entire page.'
            )}
          </p>
          <ElementSelectorTool
            selectors={selectorEntries}
            onChange={handleSelectorChange}
            multiple
            maxSelectors={8}
          />
        </div>
      </div>
    </ConfigSection>
  );
};
