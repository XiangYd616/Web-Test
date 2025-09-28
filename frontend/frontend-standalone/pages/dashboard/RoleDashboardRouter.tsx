/**
 * 基于角色的仪表板路由器
 * 根据用户角色自动导航到对应的专用仪表板
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import ModernDashboard from './ModernDashboard';
import TesterDashboard from './TesterDashboard';
import ManagerDashboard from './ManagerDashboard';
import MonitoringDashboard from './MonitoringDashboard';

// 角色优先级映射（数字越高优先级越高）
const ROLE_PRIORITY = {
  admin: 100,
  manager: 80,
  tester: 70,
  moderator: 60,
  user: 40,
  viewer: 30,
  guest: 10
};

// 角色到仪表板的映射
const ROLE_DASHBOARD_MAP = {
  admin: MonitoringDashboard,
  manager: ManagerDashboard,
  tester: TesterDashboard,
  moderator: ManagerDashboard, // 版主使用管理者仪表板
  user: ModernDashboard,
  viewer: ModernDashboard,
  guest: ModernDashboard
};

const RoleDashboardRouter: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [permissionState, { hasRole }] = usePermissions();

  // 获取用户的最高优先级角色
  const getHighestPriorityRole = () => {
    if (!user?.roles || user.roles.length === 0) {
      return 'user'; // 默认角色
    }

    // 找到优先级最高的角色
    let highestRole = 'user';
    let highestPriority = 0;

    user.roles.forEach((role) => {
      const priority = ROLE_PRIORITY[role as keyof typeof ROLE_PRIORITY] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRole = role;
      }
    });

    return highestRole;
  };

  // 根据角色选择对应的仪表板组件
  const selectDashboardComponent = () => {
    const primaryRole = getHighestPriorityRole();
    
    // 如果有多个角色，进行额外的权限检查
    if (hasRole('admin')) {
      return MonitoringDashboard;
    } else if (hasRole('manager')) {
      return ManagerDashboard;
    } else if (hasRole('tester')) {
      return TesterDashboard;
    } else {
      // 使用角色映射表
      return ROLE_DASHBOARD_MAP[primaryRole as keyof typeof ROLE_DASHBOARD_MAP] || ModernDashboard;
    }
  };

  // 如果正在加载，显示加载状态
  if (authLoading || permissionState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载仪表板...</p>
          <p className="text-gray-500 text-sm mt-2">正在为您准备个性化工作台</p>
        </div>
      </div>
    );
  }

  // 选择并渲染对应的仪表板
  const DashboardComponent = selectDashboardComponent();
  
  return <DashboardComponent />;
};

export default RoleDashboardRouter;
