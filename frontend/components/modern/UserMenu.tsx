import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { ChevronDown, LogOut, Settings, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAdmin } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Link
          to="/login"
          className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
        >
          登录
        </Link>
        <Link
          to="/register"
          className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="hidden md:block">{user.username}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-700">
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400 mt-1">
                <Shield className="w-3 h-3 mr-1" />
                管理�?              </span>
            )}
          </div>

          <Link
            to="/profile"
            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <User className="w-4 h-4 mr-2" />
            个人资料
          </Link>

          <Link
            to="/settings"
            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="w-4 h-4 mr-2" />
            设置
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <Shield className="w-4 h-4 mr-2" />
              管理后台
            </Link>
          )}

          <div className="border-t border-gray-700 mt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登�?            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
