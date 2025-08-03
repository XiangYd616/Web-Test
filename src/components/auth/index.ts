
export { default as AdminGuard } from './AdminGuard';
export { default as AuthErrorHandler } from './AuthErrorHandler';
export { default as AuthLoadingState } from './AuthLoadingState';
export { default as AuthStatusIndicator } from './AuthStatusIndicator';
export { default as LoginPrompt } from './LoginPrompt';
export { default as ProtectedFeature } from './ProtectedFeature';
export { default as withAuthCheck } from './withAuthCheck';

// 兼容性导出
export { default as ProtectedRoute } from './ProtectedRoute';

// 错误处理工具
export {
    AuthErrorType, getErrorMessage, parseAuthError, shouldRelogin
} from './AuthErrorHandler';

// 加载状态组件
export {
    AuthLoadingType, AuthSpinner, ButtonLoading, CardAuthLoading, InlineAuthLoading, PageAuthLoading
} from './AuthLoadingState';

