import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { User, Lock, LogIn, UserCheck, Crown } from 'lucide-react';

interface AuthStatusIndicatorProps {
  showInSidebar?: boolean;
  compact?: boolean;
  className?: string;
}

const AuthStatusIndicator: React.FC<AuthStatusIndicatorProps> = ({
  showInSidebar = false,
  compact = false,
  className = ""
}) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 侧边栏显示模式
  if (showInSidebar) {
    
        return (
      <div className={`${className
      }`}>
        {isAuthenticated ? (
          <div className="space-y-2">
            {/* 用户信息 */}
            <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                {user?.role === 'admin' ? (
                  <Crown className="w-4 h-4 text-green-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-300 truncate">
                  {user?.username || user?.email || '已登录'}
                </p>
                <p className="text-xs text-green-400/70">
                  {user?.role === 'admin' ? '管理员' : '用户'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 未登录状态 */}
            <div className="flex items-center space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-300">未登录</p>
                <p className="text-xs text-yellow-400/70">功能受限</p>
              </div>
            </div>

            {/* 登录按钮 */}
            <button
              onClick={handleLogin}
              className="w-full flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>登录/注册</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 紧凑模式
  if (compact) {
    
        return (
      <div className={`flex items-center space-x-2 ${className
      }`}>
        {isAuthenticated ? (
          <>
            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <UserCheck className="w-3 h-3 text-green-400" />
            </div>
            <span className="text-sm text-green-300">已登录</span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-3 h-3 text-yellow-400" />
            </div>
            <span className="text-sm text-yellow-300">未登录</span>
            <button
              onClick={handleLogin}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              登录
            </button>
          </>
        )}
      </div>
    );
  }

  // 默认模式
  return (
    <div className={`${className}`}>
      {isAuthenticated ? (
        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              {user?.role === 'admin' ? (
                <Crown className="w-5 h-5 text-green-400" />
              ) : (
                <UserCheck className="w-5 h-5 text-green-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-green-300">
                {user?.username || user?.email || '已登录用户'}
              </p>
              <p className="text-sm text-green-400/70">
                {user?.role === 'admin' ? '管理员账户' : '普通用户'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm text-green-300 hover:text-white border border-green-500/30 hover:bg-green-500/20 rounded transition-colors"
          >
            退出
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-yellow-300">未登录</p>
              <p className="text-sm text-yellow-400/70">
                登录后可使用完整功能
              </p>
            </div>
          </div>
          <button
            onClick={handleLogin}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>登录/注册</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthStatusIndicator;
