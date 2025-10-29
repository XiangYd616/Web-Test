import { TestProgress } from '../../services/api/testProgressService';

/**
 * UI缁勪欢搴撶粺涓€瀵煎嚭
 * 鎻愪緵瀹屾暣鐨勭粍浠跺簱鍔熻兘锛屽寘鎷熀纭€缁勪欢銆佷富棰樼郴缁熷拰绫诲瀷瀹氫箟
 */

// 主题系统
export * from './theme/ThemeSystem';
// Chart components removed - no longer exported from Chart module
export type { ChartProps } from './types';

// 基础UI组件
export { Badge, StatusBadge, NumberBadge, DotBadge } from './Badge';
export { Button } from './Button';
export { Card } from './Card';
export { Checkbox } from './Checkbox';
export { Input } from './Input';
export { Modal } from './Modal';
export { ProgressBar } from './ProgressBar';
export { Select } from './Select';
export { Table } from './Table';
export type { TableColumn } from './Table';
export { LoadingSpinner } from './LoadingSpinner';
export { URLInput } from './URLInput';
export { ThemeToggle } from './ThemeToggle';
export { ErrorBoundary } from '../system/ErrorHandling';

// 娴嬭瘯宸ュ叿缁勪欢
export {
    TestingToolbar, TestProgress,
    TestResultSummary
} from './TestingTools';

// 宸ュ叿鍑芥暟
export { cn } from '../../utils/cn';

// 甯哥敤绫诲瀷鍒悕
export type {
    Alignment, BaseComponentProps, BlurHandler, ChangeHandler,
    ClickHandler, ComponentState, EventHandler, FocusHandler, FormComponentProps, InteractiveComponentProps, KeyboardHandler, Position, ResponsiveValue, Size, Status, ThemeMode, Variant
} from './types';


