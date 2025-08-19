import { Bell, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface TopNavbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ onToggle }) => {
  const { setTheme, actualTheme } = useTheme();
  const { user, logout } = useAuth();

  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-sm">
      {/* 左侧 */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 hover:scale-105"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-white text-lg font-semibold">
          Test-Web 测试平台
        </h1>
      </div>

      {/* 中间搜索栏 */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="搜索测试、报告、设置..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* 右侧 */}
      <div className="flex items-center space-x-3">
        {/* 主题切换 */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 hover:scale-105"
        >
          {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* 通知 */}
        <button
          type="button"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 hover:scale-105 relative"
        >
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        {/* 用户菜单 */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center space-x-2 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 hover:scale-105"
          >
            <User size={20} />
            <span className="text-sm font-medium">{user?.username || '用户'}</span>
          </button>

          {/* 下拉菜单 */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="py-2">
              <button
                type="button"
                className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors rounded-lg mx-2"
              >
                <User size={16} />
                <span>个人资料</span>
              </button>
              <button
                type="button"
                className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors rounded-lg mx-2"
              >
                <Settings size={16} />
                <span>设置</span>
              </button>
              <hr className="my-2 border-slate-600 mx-2" />
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-red-600 transition-colors rounded-lg mx-2"
              >
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
