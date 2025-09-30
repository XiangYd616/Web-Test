/**
 * 鍩轰簬瑙掕壊鐨勪华琛ㄦ澘璺敱鍣?
 * 鏍规嵁鐢ㄦ埛瑙掕壊鑷姩瀵艰埅鍒板搴旂殑涓撶敤浠〃鏉?
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import Dashboard from './Dashboard';
import TesterDashboard from './TesterDashboard';
import ManagerDashboard from './ManagerDashboard';
import MonitoringDashboard from './MonitoringDashboard';

// 瑙掕壊浼樺厛绾ф槧灏勶紙鏁板瓧瓒婇珮浼樺厛绾ц秺楂橈級
const ROLE_PRIORITY = {
  admin: 100,
  manager: 80,
  tester: 70,
  moderator: 60,
  user: 40,
  viewer: 30,
  guest: 10
};

// 瑙掕壊鍒颁华琛ㄦ澘鐨勬槧灏?
const ROLE_DASHBOARD_MAP = {
  admin: MonitoringDashboard,
  manager: ManagerDashboard,
  tester: TesterDashboard,
  moderator: ManagerDashboard, // 鐗堜富浣跨敤绠＄悊鑰呬华琛ㄦ澘
  user: Dashboard,
  viewer: Dashboard,
  guest: Dashboard
};

const RoleDashboardRouter: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [permissionState, { hasRole }] = usePermissions();

  // 鑾峰彇鐢ㄦ埛鐨勬渶楂樹紭鍏堢骇瑙掕壊
  const getHighestPriorityRole = () => {
    if (!user?.roles || user?.roles.length === 0) {
      return 'user'; // 榛樿瑙掕壊
    }

    // 鎵惧埌浼樺厛绾ф渶楂樼殑瑙掕壊
    let highestRole = 'user';
    let highestPriority = 0;

    user?.roles.forEach((role) => {
      const priority = ROLE_PRIORITY[role as keyof typeof ROLE_PRIORITY] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRole = role;
      }
    });

    return highestRole;
  };

  // 鏍规嵁瑙掕壊閫夋嫨瀵瑰簲鐨勪华琛ㄦ澘缁勪欢
  const selectDashboardComponent = () => {
    const primaryRole = getHighestPriorityRole();
    
    // 濡傛灉鏈夊涓鑹诧紝杩涜棰濆鐨勬潈闄愭鏌?
    if (hasRole('admin')) {
      return MonitoringDashboard;
    } else if (hasRole('manager')) {
      return ManagerDashboard;
    } else if (hasRole('tester')) {
      return TesterDashboard;
    } else {
      // 浣跨敤瑙掕壊鏄犲皠琛?
      return ROLE_DASHBOARD_MAP[primaryRole as keyof typeof ROLE_DASHBOARD_MAP] || Dashboard;
    }
  };

  // 濡傛灉姝ｅ湪鍔犺浇锛屾樉绀哄姞杞界姸鎬?
  if (authLoading || permissionState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">鍔犺浇浠〃鏉?..</p>
          <p className="text-gray-500 text-sm mt-2">姝ｅ湪涓烘偍鍑嗗涓€у寲宸ヤ綔鍙?/p>
        </div>
      </div>
    );
  }

  // 閫夋嫨骞舵覆鏌撳搴旂殑浠〃鏉?
  const DashboardComponent = selectDashboardComponent();
  
  return <DashboardComponent />;
};

export default RoleDashboardRouter;
