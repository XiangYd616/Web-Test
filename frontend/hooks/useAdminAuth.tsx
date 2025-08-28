import React, { useEffect, useState } from 'react';
import type { User } from '../types/common';
import { useAuth } from './useAuth';
;

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

export const useAdminAuth = (): AdminAuthState => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [adminState, setAdminState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    user: null,
    error: null
  });

  useEffect(() => {
    if (isLoading) {
      setAdminState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (!isAuthenticated || !user) {
      setAdminState({
        isAdmin: false,
        isLoading: false,
        user: null,
        error: '请先登录'
      });
      return;
    }

    // 检查用户是否有管理员权限
    const hasAdminRole = user.role === 'admin';
    const hasAdminPermission = user.permissions?.includes('admin:access') || false;

    if (!hasAdminRole && !hasAdminPermission) {
      setAdminState({
        isAdmin: false,
        isLoading: false,
        user,
        error: '您没有访问后台管理的权限'
      });
      return;
    }

    setAdminState({
      isAdmin: true,
      isLoading: false,
      user,
      error: null
    });
  }, [user, isAuthenticated, isLoading]);

  return adminState;
};

// 管理员权限检查组件
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isLoading, error } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证管理员权限...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">访问被拒绝</h3>
            <p className="mt-2 text-sm text-gray-600">
              {error || '您没有访问此页面的权限'}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="btn btn-primary"
              >
                返回上一页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
