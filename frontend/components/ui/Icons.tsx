/**
 * 统一图标系统
 * 为所有测试页面提供一致的图标使用规范，但不强制替换现有图标
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  Bell,
  Bookmark,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Download,
  Edit,
  Eye,
  Filter,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Info,
  Loader,
  type LucideIcon,
  Menu,
  Minus,
  Network,
  PieChart,
  Play,
  Plus,
  RotateCcw,
  Search,
  Search as SearchIcon,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Square,
  Star,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wrench,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import React from 'react';

// 替代缺失的图标
const Sort = ArrowUpDown;
const _Tool = Wrench;


// 图标尺寸类型
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// 图标颜色类型
export type IconColor =
  | 'primary' | 'secondary' | 'tertiary' | 'muted' | 'disabled'
  | 'success' | 'warning' | 'error' | 'info'
  | 'white' | 'black' | 'current';

// 图标属性接口
export interface UnifiedIconProps {
  icon: LucideIcon;
  size?: IconSize;
  color?: IconColor;
  className?: string;
  strokeWidth?: number;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

/**
 * 统一图标组件
 * 提供一致的图标渲染和样式
 */
export const UnifiedIcon: React.FC<UnifiedIconProps> = ({
  icon: Icon,
  size = 'md',
  color = 'current',
  className = '',
  strokeWidth = 2,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = !ariaLabel,
  ...props
}) => {
  // 尺寸映射
  const sizeClasses = {
    xs: 'w-3 h-3',      // 12px
    sm: 'w-4 h-4',      // 16px
    md: 'w-5 h-5',      // 20px
    lg: 'w-6 h-6',      // 24px
    xl: 'w-8 h-8',      // 32px
    '2xl': 'w-10 h-10'  // 40px
  };

  // 颜色映射
  const colorClasses = {
    primary: 'text-blue-500',
    secondary: 'text-gray-400',
    tertiary: 'text-gray-500',
    muted: 'text-gray-600',
    disabled: 'text-gray-400 opacity-50',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-400',
    white: 'text-white',
    black: 'text-black',
    current: 'text-current'
  };

  const iconClasses = [
    sizeClasses[size],
    colorClasses[color],
    className
  ].filter(Boolean).join(' ');

  return (
    <Icon
      className={iconClasses}
      strokeWidth={strokeWidth}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      {...props}
    />
  );
};

/**
 * 测试类型图标映射
 */
export const TestTypeIcons = {
  performance: Zap,
  stress: Zap,
  security: Shield,
  api: Globe,
  compatibility: Smartphone,
  ux: Eye,
  seo: Search,
  network: Network,
  database: Database,
  website: Globe
} as const;

/**
 * 测试状态图标映射
 */
export const TestStatusIcons = {
  idle: Play,
  starting: Loader,
  running: Loader,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: Square,
  warning: AlertTriangle,
  pending: Clock
} as const;

/**
 * 操作图标映射
 */
export const ActionIcons = {
  start: Play,
  stop: Square,
  restart: RotateCcw,
  settings: Settings,
  download: Download,
  upload: Upload,
  share: Share2,
  copy: Copy,
  edit: Edit,
  delete: Trash2,
  add: Plus,
  remove: Minus
} as const;

/**
 * 导航图标映射
 */
export const NavigationIcons = {
  left: ChevronLeft,
  right: ChevronRight,
  up: ChevronUp,
  down: ChevronDown,
  back: ArrowLeft,
  forward: ArrowRight,
  home: Home,
  menu: Menu,
  close: X,
  search: SearchIcon,
  filter: Filter,
  sort: Sort
} as const;

/**
 * 信息图标映射
 */
export const InfoIcons = {
  info: Info,
  help: HelpCircle,
  alert: AlertCircle,
  notification: Bell,
  favorite: Star,
  like: Heart,
  bookmark: Bookmark
} as const;

/**
 * 数据图标映射
 */
export const DataIcons = {
  chart: BarChart3,
  pie: PieChart,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  activity: Activity,
  target: Target
} as const;

/**
 * 预定义图标组件
 */

// 测试类型图标组件
export const TestTypeIcon: React.FC<{
  testType: keyof typeof TestTypeIcons;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}> = ({ testType, size = 'md', color = 'primary', className = '' }) => {
  const Icon = TestTypeIcons[testType];
  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={color}
      className={className}
      aria-label={`${testType} 测试`}
    />
  );
};

// 测试状态图标组件
export const TestStatusIcon: React.FC<{
  status: keyof typeof TestStatusIcons;
  size?: IconSize;
  className?: string;
  animated?: boolean;
}> = ({ status, size = 'md', className = '', animated = false }) => {
  const Icon = TestStatusIcons[status];

  // 状态颜色映射
  const statusColors: Record<keyof typeof TestStatusIcons, IconColor> = {
    idle: 'muted',
    starting: 'primary',
    running: 'primary',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
    warning: 'warning',
    pending: 'muted'
  };

  const animationClass = animated && (status === 'starting' || status === 'running')
    ? 'animate-spin'
    : '';

  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={statusColors[status]}
      className={`${className} ${animationClass}`.trim()}
      aria-label={`状态: ${status}`}
    />
  );
};

// 操作按钮图标组件
export const ActionIcon: React.FC<{
  action: keyof typeof ActionIcons;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}> = ({ action, size = 'md', color = 'current', className = '' }) => {
  const Icon = ActionIcons[action];
  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={color}
      className={className}
      aria-label={action}
    />
  );
};

// 导航图标组件
export const NavigationIcon: React.FC<{
  direction: keyof typeof NavigationIcons;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}> = ({ direction, size = 'md', color = 'current', className = '' }) => {
  const Icon = NavigationIcons[direction];
  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={color}
      className={className}
      aria-label={direction}
    />
  );
};

// 信息图标组件
export const InfoIcon: React.FC<{
  type: keyof typeof InfoIcons;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}> = ({ type, size = 'md', color = 'info', className = '' }) => {
  const Icon = InfoIcons[type];
  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={color}
      className={className}
      aria-label={type}
    />
  );
};

// 数据图标组件
export const DataIcon: React.FC<{
  type: keyof typeof DataIcons;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}> = ({ type, size = 'md', color = 'primary', className = '' }) => {
  const Icon = DataIcons[type];
  return (
    <UnifiedIcon
      icon={Icon}
      size={size}
      color={color}
      className={className}
      aria-label={type}
    />
  );
};

/**
 * 图标使用指南组件（用于文档和示例）
 */
export const IconUsageGuide: React.FC = () => {
  return (
    <div className="space-y-8 p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold">统一图标系统使用指南</h2>

      {/* 测试类型图标 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">测试类型图标</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(TestTypeIcons).map(([type, Icon]) => (
            <div key={type} className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg">
              <Icon className="w-5 h-5 text-blue-400" />
              <span className="text-sm">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 测试状态图标 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">测试状态图标</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(TestStatusIcons).map(([status, Icon]) => (
            <div key={status} className="flex items-center space-x-2 p-3 bg-gray-800 rounded-lg">
              <Icon className="w-5 h-5 text-green-400" />
              <span className="text-sm">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 尺寸示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">图标尺寸</h3>
        <div className="flex items-center space-x-4">
          <UnifiedIcon icon={Zap} size="xs" color="primary" />
          <UnifiedIcon icon={Zap} size="sm" color="primary" />
          <UnifiedIcon icon={Zap} size="md" color="primary" />
          <UnifiedIcon icon={Zap} size="lg" color="primary" />
          <UnifiedIcon icon={Zap} size="xl" color="primary" />
          <UnifiedIcon icon={Zap} size="2xl" color="primary" />
        </div>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
          <span>xs</span>
          <span>sm</span>
          <span>md</span>
          <span>lg</span>
          <span>xl</span>
          <span>2xl</span>
        </div>
      </div>

      {/* 颜色示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">图标颜色</h3>
        <div className="flex items-center space-x-4">
          <UnifiedIcon icon={Shield} color="primary" />
          <UnifiedIcon icon={Shield} color="success" />
          <UnifiedIcon icon={Shield} color="warning" />
          <UnifiedIcon icon={Shield} color="error" />
          <UnifiedIcon icon={Shield} color="info" />
          <UnifiedIcon icon={Shield} color="muted" />
        </div>
        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
          <span>primary</span>
          <span>success</span>
          <span>warning</span>
          <span>error</span>
          <span>info</span>
          <span>muted</span>
        </div>
      </div>
    </div>
  );
};

export default UnifiedIcon;
