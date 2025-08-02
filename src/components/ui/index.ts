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
export { default as ThemeToggle } from './ThemeToggle';

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

