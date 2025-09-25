/**
 * index.ts - React组件
 * 
 * 文件路径: frontend\components\auth\index.ts
 * 创建时间: 2025-09-25
 */


export { default as AdminGuard } from './AdminGuard';
export { default as AuthErrorHandler } from './AuthErrorHandler';
export { default as AuthLoadingState } from './AuthLoadingState';
export { default as AuthStatusIndicator } from './AuthStatusIndicator';
export { default as LoginPrompt } from './LoginPrompt';
export { default as MFASetup } from './MFASetup';
export { default as MFAManagement } from './MFAManagement';
export { default as MFAVerification } from './MFAVerification';
export { default as MFAWizard } from './MFAWizard';
export { default as PasswordStrengthIndicator } from './PasswordStrengthIndicator';
export { default as PermissionManager } from './PermissionManager';
export { default as ProtectedFeature } from './ProtectedFeature';
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as withAuthCheck } from './withAuthCheck';
// 错误处理工具
export {
    AuthErrorType, getErrorMessage, parseAuthError, shouldRelogin
} from './AuthErrorHandler';

// 加载状态组件
export {
    AuthLoadingType, AuthSpinner, ButtonLoading, CardAuthLoading, InlineAuthLoading, PageAuthLoading
} from './AuthLoadingState';

