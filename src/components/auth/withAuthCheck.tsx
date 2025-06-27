import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPrompt from './LoginPrompt';

interface WithAuthCheckOptions {
  feature?: string;
  description?: string;
  requireAuth?: boolean; // 是否强制要求登录
  showPrompt?: boolean;  // 是否显示登录提示
}

// 高阶组件：为组件添加登录检查功能
export function withAuthCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthCheckOptions = {}
) {
  const {
    feature = "此功能",
    description = "使用此功能",
    requireAuth = false,
    showPrompt = true
  } = options;

  return function AuthCheckedComponent(props: P) {
    const { isAuthenticated } = useAuth();
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // 如果强制要求登录且用户未登录，显示登录提示
    if (requireAuth && !isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">需要登录</h2>
              <p className="text-gray-300 mb-6">{description}需要登录账户</p>
              <LoginPrompt
                isOpen={true}
                onClose={() => {}}
                feature={feature}
                description={description}
              />
            </div>
          </div>
        </div>
      );
    }

    // 传递额外的props给包装的组件
    const enhancedProps = {
      ...props,
      isAuthenticated,
      showLoginPrompt: () => setShowLoginPrompt(true),
      requireLogin: () => {
        if (!isAuthenticated && showPrompt) {
          setShowLoginPrompt(true);
          return false;
        }
        return true;
      }
    } as P & {
      isAuthenticated: boolean;
      showLoginPrompt: () => void;
      requireLogin: () => boolean;
    };

    return (
      <>
        <WrappedComponent {...enhancedProps} />
        {showPrompt && (
          <LoginPrompt
            isOpen={showLoginPrompt}
            onClose={() => setShowLoginPrompt(false)}
            feature={feature}
            description={description}
          />
        )}
      </>
    );
  };
}

// Hook：用于在组件内部检查登录状态
export function useAuthCheck(options: WithAuthCheckOptions = {}) {
  const { isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const {
    feature = "此功能",
    description = "使用此功能",
    showPrompt = true
  } = options;

  const requireLogin = () => {
    if (!isAuthenticated) {
      if (showPrompt) {
        setShowLoginPrompt(true);
      }
      return false;
    }
    return true;
  };

  const LoginPromptComponent = showPrompt ? (
    <LoginPrompt
      isOpen={showLoginPrompt}
      onClose={() => setShowLoginPrompt(false)}
      feature={feature}
      description={description}
    />
  ) : null;

  return {
    isAuthenticated,
    requireLogin,
    showLoginPrompt: () => setShowLoginPrompt(true),
    hideLoginPrompt: () => setShowLoginPrompt(false),
    LoginPromptComponent
  };
}

export default withAuthCheck;
