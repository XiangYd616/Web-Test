import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {LoadingSpinner} from '../ui/index';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    
        return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" text="验证用户身份..." />
      </div>
    );
      }

  if (!user) {
    
        // 保存当前路径，登录后重定向回来
    return <Navigate to="/login" state={{ from: location
      }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
