import {
  Bookmark,
  ChevronRight,
  Crown,
  HelpCircle,
  LogOut,
  Monitor,
  Settings,
  User
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserStats } from '../../hooks/useUserStats';
import { ThemeToggle } from '../ui';

interface UserDropdownMenuProps {
  onClose: () => void;
}

const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({ onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const { actualTheme } = useTheme();
  const { stats, loading: statsLoading } = useUserStats();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleMenuItemClick = () => {
    onClose();
  };

  return (
    <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-[9999] border backdrop-blur-sm ${actualTheme === 'light'
      ? 'bg-white/95 border-gray-200'
      : 'bg-gray-800/95 border-gray-700'
      }`}>
      {/* 用户信息头部 */}
      <div className={`p-4 border-b ${actualTheme === 'light' ? 'border-gray-200' : 'border-gray-700'
        }`}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {user?.role === 'admin' ? (
                <Crown className="w-6 h-6 text-white" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            {/* 在线状态指示器 */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className={`text-sm font-semibold truncate ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                {user?.username || '用户'}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  管理员
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
              {user?.email}
            </p>
            <div className="flex items-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className={`text-xs ${actualTheme === 'light' ? 'text-green-600' : 'text-green-400'
                }`}>
                在线
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷统计 */}
      <div className={`px-4 py-3 border-b ${actualTheme === 'light' ? 'border-gray-200 bg-gray-50/50' : 'border-gray-700 bg-gray-700/30'
        }`}>
        {statsLoading ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className={`h-6 w-8 mx-auto mb-1 rounded ${actualTheme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                  }`}></div>
                <div className={`h-3 w-12 mx-auto rounded ${actualTheme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
                  }`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className={`text-lg font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                {stats?.totalTests || 0}
              </div>
              <div className={`text-xs ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                总测试数
              </div>
            </div>
            <div>
              <div className={`text-lg font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                {stats?.favoriteTests || 0}
              </div>
              <div className={`text-xs ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                收藏夹
              </div>
            </div>
            <div>
              <div className={`text-lg font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                {stats?.testsToday || 0}
              </div>
              <div className={`text-xs ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                今日测试
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 菜单项 */}
      <div className="p-2">
        {/* 个人资料 */}
        <Link
          to="/profile"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${actualTheme === 'light'
            ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          onClick={handleMenuItemClick}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
            }`}>
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">个人资料</span>
            <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
              }`}>
              查看和编辑个人信息
            </p>
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* 收藏夹 */}
        <Link
          to="/bookmarks"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${actualTheme === 'light'
            ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          onClick={handleMenuItemClick}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
            ? 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100'
            : 'bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30'
            }`}>
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">收藏夹</span>
            <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
              }`}>
              管理收藏的测试和页面
            </p>
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* 设置 */}
        <Link
          to="/settings"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${actualTheme === 'light'
            ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          onClick={handleMenuItemClick}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
            ? 'bg-gray-50 text-gray-600 group-hover:bg-gray-100'
            : 'bg-gray-500/20 text-gray-400 group-hover:bg-gray-500/30'
            }`}>
            <Settings className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">设置</span>
            <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
              }`}>
              偏好设置和配置
            </p>
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* 帮助中心 */}
        <Link
          to="/help"
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${actualTheme === 'light'
            ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          onClick={handleMenuItemClick}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
            ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
            : 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30'
            }`}>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium">帮助中心</span>
            <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
              }`}>
              使用指南和常见问题
            </p>
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* 管理员菜单 */}
        {isAdmin && (
          <>
            <div className={`my-2 border-t ${actualTheme === 'light' ? 'border-gray-200' : 'border-gray-700'
              }`}></div>
            <Link
              to="/admin"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${actualTheme === 'light'
                ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              onClick={handleMenuItemClick}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
                ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-100'
                : 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30'
                }`}>
                <Crown className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">后台管理</span>
                <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                  系统管理和配置
                </p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </>
        )}
      </div>

      {/* 主题切换 */}
      <div className={`p-2 border-t ${actualTheme === 'light' ? 'border-gray-200' : 'border-gray-700'
        }`}>
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-700/30'
          }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded-lg ${actualTheme === 'light'
              ? 'bg-orange-50 text-orange-600'
              : 'bg-orange-500/20 text-orange-400'
              }`}>
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-sm font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                主题模式
              </span>
              <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                {actualTheme === 'light' ? '浅色模式' : '深色模式'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* 退出登录 */}
      <div className={`p-2 border-t ${actualTheme === 'light' ? 'border-gray-200' : 'border-gray-700'
        }`}>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full group ${actualTheme === 'light'
            ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
            : 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
            }`}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${actualTheme === 'light'
            ? 'bg-red-50 text-red-600 group-hover:bg-red-100'
            : 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30'
            }`}>
            <LogOut className="w-4 h-4" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-medium">退出登录</span>
            <p className={`text-xs ${actualTheme === 'light' ? 'text-red-500' : 'text-red-500'
              }`}>
              安全退出当前账户
            </p>
          </div>
        </button>
      </div>

      {/* 版本信息 */}
      <div className={`px-4 py-2 border-t text-center ${actualTheme === 'light' ? 'border-gray-200 bg-gray-50/50' : 'border-gray-700 bg-gray-700/30'
        }`}>
        <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-500'
          }`}>
          Test Web App v2.1.0
        </p>
        <p className={`text-xs ${actualTheme === 'light' ? 'text-gray-400' : 'text-gray-600'
          }`}>
          © 2024 专业测试平台
        </p>
      </div>
    </div>
  );
};

export default UserDropdownMenu;
