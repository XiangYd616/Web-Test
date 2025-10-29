/**
 * Role-based Dashboard Router
 * Automatically navigates to the corresponding dashboard based on user role
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import Dashboard from './Dashboard';
import TesterDashboard from './TesterDashboard';
import ManagerDashboard from './ManagerDashboard';
import MonitoringDashboard from './MonitoringDashboard';

// Role priority mapping (higher number = higher priority)
const ROLE_PRIORITY = {
  admin: 100,
  manager: 80,
  tester: 70,
  moderator: 60,
  user: 40,
  viewer: 30,
  guest: 10
};

// Role to dashboard mapping
const ROLE_DASHBOARD_MAP = {
  admin: MonitoringDashboard,
  manager: ManagerDashboard,
  tester: TesterDashboard,
  moderator: ManagerDashboard, // Moderators use manager dashboard
  user: Dashboard,
  viewer: Dashboard,
  guest: Dashboard
};

const RoleDashboardRouter: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [permissionState, { hasRole }] = usePermissions();

  // Get user's highest priority role
  const getHighestPriorityRole = () => {
    if (!user?.role) {
      return 'user'; // Default role
    }

    // User has a single role
    return user.role;
  };

  // Select corresponding dashboard component based on role
  const selectDashboardComponent = () => {
    const primaryRole = getHighestPriorityRole();
    
    // If user has multiple roles, perform additional permission checks
    if (hasRole('admin')) {
      return MonitoringDashboard;
    } else if (hasRole('manager')) {
      return ManagerDashboard;
    } else if (hasRole('tester')) {
      return TesterDashboard;
    } else {
      // Use role mapping table
      return ROLE_DASHBOARD_MAP[primaryRole as keyof typeof ROLE_DASHBOARD_MAP] || Dashboard;
    }
  };

  // Show loading state while authenticating
  if (authLoading || permissionState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Preparing your personalized workspace</p>
        </div>
      </div>
    );
  }

  // Select and render corresponding dashboard
  const DashboardComponent = selectDashboardComponent();
  
  return <DashboardComponent />;
};

export default RoleDashboardRouter;
