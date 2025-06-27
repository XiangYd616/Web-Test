import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Eye, EyeOff, Shield, Star } from 'lucide-react';
import LoginPrompt from './LoginPrompt';

interface ProtectedFeatureProps {
  children: React.ReactNode;
  feature?: string;
  description?: string;
  showPreview?: boolean;
  previewHeight?: string;
  className?: string;
}

const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({
  children,
  feature = "此功能",
  description = "使用此功能",
  showPreview = true,
  previewHeight = "400px",
  className = ""
}) => {
  const { isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showPreviewContent, setShowPreviewContent] = useState(false);

  // 如果用户已登录，直接显示内容
  if (isAuthenticated) {
    return <div className={className}>{children}</div>;
  }

  // 未登录用户的界面
  return (
    <div className={`relative ${className}`}>
      {/* 预览内容 */}
      {showPreview && (
        <div 
          className="relative overflow-hidden rounded-xl border border-gray-700/50"
          style={{ height: previewHeight }}
        >
          {/* 模糊的内容预览 */}
          <div className={`${showPreviewContent ? 'blur-sm' : 'blur-md'} transition-all duration-300`}>
            {children}
          </div>
          
          {/* 覆盖层 */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-900/80 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              {/* 锁定图标 */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
              
              {/* 标题和描述 */}
              <h3 className="text-xl font-bold text-white mb-2">
                {feature}需要登录
              </h3>
              <p className="text-gray-300 mb-6">
                登录后即可使用完整功能
              </p>
              
              {/* 功能亮点 */}
              <div className="space-y-2 mb-6 text-left">
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>保存测试历史记录</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>个性化设置和偏好</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>高级分析和报告</span>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Lock className="w-5 h-5" />
                  <span>登录/注册使用</span>
                </button>
                
                <button
                  onClick={() => setShowPreviewContent(!showPreviewContent)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {showPreviewContent ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>隐藏预览</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>预览功能</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 无预览模式 */}
      {!showPreview && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            {feature}需要登录
          </h3>
          <p className="text-gray-300 mb-6">
            {description}需要登录账户
          </p>
          
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <Lock className="w-5 h-5" />
            <span>登录/注册</span>
          </button>
        </div>
      )}

      {/* 登录提示弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        feature={feature}
        description={description}
      />
    </div>
  );
};

export default ProtectedFeature;
