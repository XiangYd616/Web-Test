import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import {
  Activity,
  Bug,
  Eye,
  Gauge,
  Globe,
  Laptop,
  MonitorSmartphone,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import { TEST_TYPE_LABELS, type TestType } from '../../context/TestContext';

type TestTypeCardSelectorProps = {
  testTypes: TestType[];
  selectedType: TestType;
  onSelect: (type: TestType) => void;
};

const TEST_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  performance: Gauge,
  api: Activity,
  security: Shield,
  seo: Search,
  stress: Zap,
  accessibility: Eye,
  ux: MonitorSmartphone,
  compatibility: Laptop,
  website: Globe,
};

const TEST_TYPE_COLORS: Record<string, string> = {
  performance:
    'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 data-[active=true]:border-blue-500 data-[active=true]:bg-blue-500/15',
  api: 'border-green-500/40 bg-green-500/5 hover:bg-green-500/10 data-[active=true]:border-green-500 data-[active=true]:bg-green-500/15',
  security:
    'border-red-500/40 bg-red-500/5 hover:bg-red-500/10 data-[active=true]:border-red-500 data-[active=true]:bg-red-500/15',
  seo: 'border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 data-[active=true]:border-purple-500 data-[active=true]:bg-purple-500/15',
  stress:
    'border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 data-[active=true]:border-orange-500 data-[active=true]:bg-orange-500/15',
  accessibility:
    'border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10 data-[active=true]:border-teal-500 data-[active=true]:bg-teal-500/15',
  ux: 'border-pink-500/40 bg-pink-500/5 hover:bg-pink-500/10 data-[active=true]:border-pink-500 data-[active=true]:bg-pink-500/15',
  compatibility:
    'border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 data-[active=true]:border-cyan-500 data-[active=true]:bg-cyan-500/15',
  website:
    'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 data-[active=true]:border-indigo-500 data-[active=true]:bg-indigo-500/15',
};

const TEST_TYPE_ICON_COLORS: Record<string, string> = {
  performance: 'text-blue-500',
  api: 'text-green-500',
  security: 'text-red-500',
  seo: 'text-purple-500',
  stress: 'text-orange-500',
  accessibility: 'text-teal-500',
  ux: 'text-pink-500',
  compatibility: 'text-cyan-500',
  website: 'text-indigo-500',
};

const TEST_TYPE_DESC_KEYS: Record<string, string> = {
  performance: 'testTypeDesc.performance',
  api: 'testTypeDesc.api',
  security: 'testTypeDesc.security',
  seo: 'testTypeDesc.seo',
  stress: 'testTypeDesc.stress',
  accessibility: 'testTypeDesc.accessibility',
  ux: 'testTypeDesc.ux',
  compatibility: 'testTypeDesc.compatibility',
  website: 'testTypeDesc.website',
};

const TEST_TYPE_DESC_FALLBACK: Record<string, string> = {
  performance: '页面加载与性能指标',
  api: 'REST API 接口测试',
  security: '安全漏洞与合规检测',
  seo: '搜索引擎优化分析',
  stress: '并发压力与负载测试',
  accessibility: 'WCAG 无障碍检测',
  ux: '用户体验与核心指标',
  compatibility: '跨浏览器兼容性',
  website: '网站综合评估',
};

const TestTypeCardSelector = ({ testTypes, selectedType, onSelect }: TestTypeCardSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className='grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2'>
      {testTypes.map(type => {
        const Icon = TEST_TYPE_ICONS[type] ?? Bug;
        const isActive = type === selectedType;
        const colorClass = TEST_TYPE_COLORS[type] ?? '';
        const iconColor = TEST_TYPE_ICON_COLORS[type] ?? 'text-muted-foreground';
        const descKey = TEST_TYPE_DESC_KEYS[type];
        const descFallback = TEST_TYPE_DESC_FALLBACK[type] ?? '';

        return (
          <button
            key={type}
            type='button'
            data-active={isActive}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all cursor-pointer',
              'text-center min-h-[72px] justify-center',
              colorClass,
              isActive && 'ring-1 ring-offset-1 shadow-sm'
            )}
            onClick={() => onSelect(type)}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
            <span className='text-[11px] font-medium leading-tight truncate w-full'>
              {t(TEST_TYPE_LABELS[type] ?? type)}
            </span>
            <span className='text-[9px] text-muted-foreground leading-tight truncate w-full hidden sm:block'>
              {t(descKey, descFallback)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TestTypeCardSelector;
