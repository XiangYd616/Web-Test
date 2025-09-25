/**
 * AdminGuard.tsx - React组件
 * 
 * 文件路径: frontend\components\auth\AdminGuard.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import type { ReactNode, FC } from 'react';
import { AlertTriangle, ArrowLeft, Lock, Shield } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
  showFallback?: boolean;
}

const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallbackPath = '/',
  showFallback = true,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 加载中状态
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

  // 未登录用户重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查管理员权限
  const isAdmin = user?.role === 'admin';
  const hasAdminPermission = user?.permissions?.includes('admin:access');

  if (!isAdmin && !hasAdminPermission) {
    // 如果不显示回退页面，直接重定向
    if (!showFallback) {
      return <Navigate to={fallbackPath} replace />;
    }

    // 显示权限不足页面
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* 图标 */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <Lock className="h-8 w-8 text-red-600" />
            </div>

            {/* 标题 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              访问被拒绝
            </h1>

            {/* 描述 */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">权限不足</span>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                您正在尝试访问后台管理系统，但您的账户没有相应的管理员权限。
                如果您认为这是一个错误，请联系系统管理员。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>当前用户: <span className="font-medium">{user?.username}</span></div>
                  <div>用户角色: <span className="font-medium">{user?.role || '普通用户'}</span></div>
                  <div>访问时间: <span className="font-medium">{new Date().toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回上一页
              </button>

              <button
                type="button"
                onClick={() => window.location.href = fallbackPath}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                返回首页
              </button>
            </div>

            {/* 安全提示 */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  <p className="font-medium mb-1">安全提示</p>
                  <p>此访问尝试已被记录。未经授权访问系统管理功能可能违反使用条款。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 权限验证通过，渲染子组件
  return <>{children}</>;
};

export default AdminGuard;
