import React from 'react';
import {useNavigate} from 'react-router-dom';

import {Lock, ArrowRight, Shield, Star, X, LogIn} from 'lucide-react';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  description?: string;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({
  isOpen,
  onClose,
  feature = "此功能",
  description = "使用高级测试功能"
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 max-w-md w-full mx-4 relative">
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="关闭登录提示"
          title="关闭登录提示"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 图标和标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">需要登录</h2>
          <p className="text-gray-300">
            {description}需要登录账户
          </p>
        </div>

        {/* 功能说明 */}
        <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-white font-medium">登录后您可以：</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>使用所有测试工具和功能</span>
            </li>
            <li className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>保存和查看测试历史记录</span>
            </li>
            <li className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>个性化设置和偏好配置</span>
            </li>
            <li className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>高级数据管理和分析</span>
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span>登录 / 注册</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 底部说明 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            已有账户可直接登录，新用户可快速注册
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
