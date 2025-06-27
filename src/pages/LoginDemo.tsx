import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, 
  Lock, 
  CheckCircle, 
  XCircle, 
  User,
  Crown,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import ProtectedFeature from '../components/auth/ProtectedFeature';
import AuthStatusIndicator from '../components/auth/AuthStatusIndicator';
import { useAuthCheck } from '../components/auth/withAuthCheck';

const LoginDemo: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  
  // 使用登录检查Hook
  const { 
    requireLogin, 
    LoginPromptComponent 
  } = useAuthCheck({
    feature: "演示功能",
    description: "查看登录演示"
  });

  const handleProtectedAction = () => {
    if (requireLogin()) {
      alert('登录成功！您可以使用此功能。');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            登录机制演示
          </h1>
          <p className="text-xl text-gray-300">
            展示用户可以查看页面，但使用功能需要登录的机制
          </p>
        </div>

        {/* 当前登录状态 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span>当前登录状态</span>
          </h2>
          
          <AuthStatusIndicator className="mb-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {isAuthenticated ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-medium text-white">认证状态</span>
              </div>
              <p className={`text-sm ${isAuthenticated ? 'text-green-300' : 'text-red-300'}`}>
                {isAuthenticated ? '已登录' : '未登录'}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-white">用户信息</span>
              </div>
              <p className="text-sm text-gray-300">
                {user?.username || user?.email || '未登录用户'}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {user?.role === 'admin' ? (
                  <Crown className="w-5 h-5 text-yellow-400" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium text-white">用户角色</span>
              </div>
              <p className="text-sm text-gray-300">
                {user?.role === 'admin' ? '管理员' : user ? '普通用户' : '访客'}
              </p>
            </div>
          </div>
        </div>

        {/* 功能演示区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 可访问的内容 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-400" />
              <span>可访问内容</span>
            </h3>
            
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-medium text-green-300 mb-2">✅ 页面浏览</h4>
                <p className="text-sm text-green-200">
                  所有用户都可以访问和浏览测试工具页面，查看界面和功能介绍。
                </p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-medium text-green-300 mb-2">✅ 功能预览</h4>
                <p className="text-sm text-green-200">
                  未登录用户可以看到功能的预览界面，了解工具的能力。
                </p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-medium text-green-300 mb-2">✅ 登录提示</h4>
                <p className="text-sm text-green-200">
                  当尝试使用功能时，会友好地提示用户登录。
                </p>
              </div>
            </div>
          </div>

          {/* 需要登录的功能 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-yellow-400" />
              <span>需要登录的功能</span>
            </h3>
            
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-300 mb-2">🔒 测试执行</h4>
                <p className="text-sm text-yellow-200">
                  执行各种测试工具需要登录账户。
                </p>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-300 mb-2">🔒 历史记录</h4>
                <p className="text-sm text-yellow-200">
                  查看和管理测试历史记录需要登录。
                </p>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-300 mb-2">🔒 高级功能</h4>
                <p className="text-sm text-yellow-200">
                  数据导出、报告生成等高级功能需要登录。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 交互演示 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5 text-purple-400" />
            <span>交互演示</span>
          </h3>
          
          <div className="space-y-4">
            <button
              onClick={handleProtectedAction}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isAuthenticated ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>执行受保护的操作</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>尝试执行操作（需要登录）</span>
                </>
              )}
            </button>
            
            <p className="text-sm text-gray-400 text-center">
              {isAuthenticated 
                ? '您已登录，可以执行此操作' 
                : '点击按钮将显示登录提示'
              }
            </p>
          </div>
        </div>

        {/* 受保护功能演示 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <EyeOff className="w-5 h-5 text-red-400" />
            <span>受保护功能演示</span>
          </h3>
          
          <ProtectedFeature
            feature="高级分析工具"
            description="使用高级分析功能"
            showPreview={true}
            previewHeight="300px"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white text-center">
              <h4 className="text-2xl font-bold mb-4">🎉 恭喜！</h4>
              <p className="text-lg">您已成功访问受保护的功能！</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-2xl font-bold">95%</div>
                  <div className="text-sm">性能评分</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-2xl font-bold">1.2s</div>
                  <div className="text-sm">加载时间</div>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <div className="text-2xl font-bold">A+</div>
                  <div className="text-sm">安全等级</div>
                </div>
              </div>
            </div>
          </ProtectedFeature>
        </div>

        {/* 登录提示组件 */}
        {LoginPromptComponent}
      </div>
    </div>
  );
};

export default LoginDemo;
