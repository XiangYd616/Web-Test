/**
 * 🎨 UI组件统一导出
 */

// 基础UI组件
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingStates } from './LoadingStates';

// 增强UI组件
export { default as EnhancedErrorBoundary } from './EnhancedErrorBoundary';
export { default as EnhancedLoadingSpinner, InlineLoadingSpinner, SimpleLoadingSpinner } from './EnhancedLoadingSpinner';
export { default as NotificationSystem } from './NotificationSystem';

// 主题相关组件
export { default as ThemeProvider } from './ThemeProvider';
export { ThemeSelector, ThemeSwitch, default as ThemeToggle } from './ThemeToggle';

// 为了向后兼容，将EnhancedLoadingSpinner也导出为LoadingSpinner
export { default as LoadingSpinner } from './EnhancedLoadingSpinner';

// 新的组件库系统
// 按钮组件
export {
    Button,
    DeleteButton, GhostButton, IconButton, OutlineButton, PrimaryButton,
    SecondaryButton
} from './Button';

// 复选框组件
export {
    Checkbox,
    SimpleCheckbox
} from './Checkbox';

// 卡片组件
export {
    Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle, SimpleCard
} from './Card';

// 模态框组件
export {
    ConfirmModal, Modal, ModalBody,
    ModalFooter, ModalHeader
} from './Modal';

// 输入组件
export {
    Input, NumberInput, PasswordInput,
    SearchInput, Select, Textarea
} from './Input';

// URL输入组件
export { SimpleURLInput } from './SimpleURLInput';
export { URLInput } from './URLInput';

// 徽章组件
export {
    Badge, DotBadge, NumberBadge, ProgressBadge, StatusBadge, TagBadge
} from './Badge';

// 统计卡片组件
export {
    StatCard
} from './StatCard';

// 表格组件
export { Table } from './Table';
export type { TableColumn, TableProps } from './Table';

// 加载组件
export {
    ButtonLoading,
    CardLoading, InlineLoading, Loading,
    PageLoading, SkeletonLoading, TableLoading
} from './Loading';
export type { LoadingProps, LoadingSize, LoadingType } from './Loading';

// 进度条组件
export { CircularProgressBar, ProgressBar, SteppedProgressBar } from './ProgressBar';

// 状态指示器组件
export { ConnectionStatusIndicator, StatusIndicator, TestStatusIndicator } from './StatusIndicator';

// 图表组件
export {
    ChartContainer, MetricChart, SimpleChart
} from './Chart';

// 测试工具组件
export { TestingToolbar, TestProgress, TestResultSummary } from './TestingTools';

