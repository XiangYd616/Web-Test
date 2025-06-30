/**
 * 🔐 认证组件统一导出
 */

export { default as AdminGuard } from './AdminGuard';
export { default as AuthStatusIndicator } from './AuthStatusIndicator';
export { default as LoginPrompt } from './LoginPrompt';
export { default as ProtectedFeature } from './ProtectedFeature';
export { default as withAuthCheck } from './withAuthCheck';

// 兼容性导出
export { default as ProtectedRoute } from './ProtectedRoute';
