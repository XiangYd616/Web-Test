/**
 * 角色守卫组件;
 * 基于用户角色和权限控制访问;
 */
import React from 'react';import { Navigate     } from 'react-router-dom';import { useAuth     } from '../../contexts/AuthContext';import { usePermissions     } from '../../hooks/usePermissions';interface RoleGuardProps   { 
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: React.ComponentType;
  redirectTo?: string;
 }
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,;
  requiredRoles = [],;
  requiredPermissions = [],;
  requireAll = false,;
  fallback: Fallback,;
  redirectTo = '/unauthorized'
}) => {
  const { user } = useAuth();
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = usePermissions();
  // 检查角色权限
  const hasRequiredRoles = () => { if (requiredRoles.length === 0) return true;
    return requireAll;
      ? requiredRoles.every(role => hasRole(role));
      : hasAnyRole(requiredRoles);
   };
  // 检查操作权限
  const hasRequiredPermissions = () => { if (requiredPermissions.length === 0) return true;
    return requireAll;
      ? requiredPermissions.every(permission => hasPermission(permission));
      : hasAnyPermission(requiredPermissions);
   };
  // 检查是否有访问权限
  const hasAccess = hasRequiredRoles() && hasRequiredPermissions();
  if (!hasAccess) {
    if (Fallback) {
      return <Fallback  />;
    }
    return <Navigate to={redirectTo} replace    />;
  }
  return <>{children}</>;
};
/**
 * 条件渲染组件 - 基于权限显示/隐藏内容
 */
export const ConditionalRender: React.FC<{,
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}> = ({ children, roles, permissions, requireAll = false, fallback = null }) => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = usePermissions();
  const hasRequiredRoles = () => { if (!roles || roles.length === 0) return true;
    return requireAll;
      ? roles.every(role => hasRole(role));
      : hasAnyRole(roles);
   };
  const hasRequiredPermissions = () => { if (!permissions || permissions.length === 0) return true;
    return requireAll;
      ? permissions.every(permission => hasPermission(permission));
      : hasAnyPermission(permissions);
   };
  const hasAccess = hasRequiredRoles() && hasRequiredPermissions();
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
export default RoleGuard;'