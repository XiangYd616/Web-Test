
/**
 * UI组件库统一导出
 * 提供完整的组件库功能，包括基础组件、主题系统和类型定义
 */

// 主题系统
export * from './theme/ThemeSystem';
export { default as ThemeProvider } from './ThemeProvider';
export { ThemeSelector, ThemeSwitch, default as ThemeToggle } from './ThemeToggle';

// 类型定义
export * from './types';

// 基础UI组件
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingStates } from './LoadingStates';

// 增强UI组件
export { default as EnhancedErrorBoundary } from './EnhancedErrorBoundary';
export { default as EnhancedLoadingSpinner, InlineLoadingSpinner, SimpleLoadingSpinner } from './EnhancedLoadingSpinner';
export { default as NotificationSystem } from './NotificationSystem';

// 为了向后兼容，将EnhancedLoadingSpinner也导出为LoadingSpinner
export { default as LoadingSpinner } from './EnhancedLoadingSpinner';

// 按钮组件
export {
    Button,
    DeleteButton,
    GhostButton,
    IconButton,
    OutlineButton,
    PrimaryButton,
    SecondaryButton
} from './Button';
export type { ButtonProps } from './types';

// 输入组件
export {
    Input,
    NumberInput,
    PasswordInput,
    SearchInput,
    Select,
    Textarea
} from './Input';
export type {
    InputProps, SelectOption, SelectProps, TextareaProps
} from './types';

// 复选框组件
export {
    Checkbox,
    SimpleCheckbox
} from './Checkbox';
export type { CheckboxProps } from './types';

// 卡片组件
export {
    Card,
    CardBody,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    SimpleCard
} from './Card';
export type { CardProps } from './types';

// 模态框组件
export {
    ConfirmModal,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader
} from './Modal';
export type { ModalProps } from './types';

// 表格组件
export { Table } from './Table';
export type {
    TableColumn, TablePagination, TableProps,
    TableRowSelection
} from './types';

// URL输入组件
export { SimpleURLInput } from './SimpleURLInput';
export { URLInput } from './URLInput';

// 徽章组件
export {
    Badge,
    DotBadge,
    NumberBadge,
    ProgressBadge,
    StatusBadge,
    TagBadge
} from './Badge';
export type { BadgeProps } from './types';

// 统计卡片组件
export { StatCard } from './StatCard';

// 加载组件
export {
    ButtonLoading,
    CardLoading,
    InlineLoading,
    Loading,
    PageLoading,
    SkeletonLoading,
    TableLoading
} from './Loading';
export type {
    LoadingProps,
    LoadingSize,
    LoadingType
} from './Loading';

// 进度条组件
export {
    CircularProgressBar,
    ProgressBar,
    SteppedProgressBar
} from './ProgressBar';
export type { ProgressProps } from './types';

// 状态指示器组件
export {
    ConnectionStatusIndicator,
    StatusIndicator,
    TestStatusIndicator
} from './StatusIndicator';
export type { StatusIndicatorProps } from './types';

// 图表组件
export {
    ChartContainer,
    MetricChart,
    SimpleChart
} from './Chart';
export type { ChartProps } from './types';

// 测试工具组件
export {
    TestProgress,
    TestResultSummary, TestingToolbar
} from './TestingTools';

// 工具函数
export { cn } from '../../utils/cn';

// 常用类型别名
export type {
    Alignment, BaseComponentProps, BlurHandler, ChangeHandler,
    ClickHandler, ComponentState, EventHandler, FocusHandler, FormComponentProps, InteractiveComponentProps, KeyboardHandler, Position, ResponsiveValue, Size, Status, ThemeMode, Variant
} from './types';

